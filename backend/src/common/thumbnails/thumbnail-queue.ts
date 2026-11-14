import { createHash, randomUUID } from 'crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'path';
import {
  createImageThumbnail,
  getImageThumbnailPath,
  isSupportedImageFilename,
} from '../utils/image-thumbnail.util';

type ThumbnailJob = {
  source: string;
  attempts: number;
  nextAttemptAt: number;
  failed: boolean;
};

type QueueOptions = {
  uploadsDirectory: string;
  concurrency: number;
  maxAttempts: number;
  retryDelayMs: number;
  generate?: (path: string) => Promise<unknown>;
  onError?: (message: string) => void;
};

// Durable local queue for the API's existing single-process, local upload storage.
// Jobs stay on disk during processing, so a process exit cannot lose pending work.
export class ThumbnailQueue {
  private readonly jobs = new Map<string, ThumbnailJob>();
  private readonly enqueuing = new Map<string, Promise<void>>();
  private readonly directory: string;
  private running: Promise<void> | undefined;
  private stopped = false;

  constructor(private readonly options: QueueOptions) {
    this.directory = join(resolve(options.uploadsDirectory), '.thumbnail-jobs');
  }

  private sourcePath(source: string) {
    const path = resolve(this.options.uploadsDirectory, source);
    const rel = relative(resolve(this.options.uploadsDirectory), path);
    if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) {
      throw new Error('Thumbnail source must be inside uploads directory');
    }
    return path;
  }

  private jobPath(source: string) {
    return join(
      this.directory,
      `${createHash('sha256').update(source).digest('hex')}.json`,
    );
  }

  private async persist(job: ThumbnailJob) {
    const target = this.jobPath(job.source);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(job));
      await rename(temporary, target);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  }

  async initialize() {
    await mkdir(this.directory, { recursive: true });
    for (const filename of await readdir(this.directory)) {
      if (!filename.endsWith('.json')) continue;
      try {
        const job = JSON.parse(
          await readFile(join(this.directory, filename), 'utf8'),
        ) as ThumbnailJob;
        if (
          typeof job.source !== 'string' ||
          !Number.isInteger(job.attempts) ||
          job.attempts < 0 ||
          !Number.isFinite(job.nextAttemptAt) ||
          typeof job.failed !== 'boolean'
        ) {
          throw new Error('Invalid thumbnail job');
        }
        this.sourcePath(job.source);
        if (!job.failed && job.attempts >= this.options.maxAttempts) {
          job.failed = true;
          await this.persist(job);
          this.options.onError?.(
            `Thumbnail ${job.source} exhausted its attempts before restart`,
          );
        }
        this.jobs.set(job.source, job);
      } catch (error) {
        this.options.onError?.(
          `Cannot load thumbnail job ${filename}: ${String(error)}`,
        );
      }
    }
    // Repair the small gap between a successful DB commit and persisting its job.
    // Also recovers existing uploads without thumbnails. No source files are modified.
    await this.recoverMissingThumbnails(resolve(this.options.uploadsDirectory));
  }

  private async recoverMissingThumbnails(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (
        entry.isDirectory() &&
        !['.thumbnail-jobs', 'request-files'].includes(entry.name)
      ) {
        await this.recoverMissingThumbnails(path);
      } else if (entry.isFile() && isSupportedImageFilename(entry.name)) {
        if (
          !(await stat(getImageThumbnailPath(path)).catch(() => null))?.isFile()
        ) {
          await this.enqueue(path);
        }
      }
    }
  }

  async enqueue(originalPath: string) {
    const source = relative(
      resolve(this.options.uploadsDirectory),
      resolve(originalPath),
    );
    this.sourcePath(source);
    if (this.jobs.has(source)) return;
    const pending = this.enqueuing.get(source);
    if (pending) return pending;
    const job: ThumbnailJob = {
      source,
      attempts: 0,
      nextAttemptAt: 0,
      failed: false,
    };
    const saving = this.persist(job)
      .then(() => {
        this.jobs.set(source, job);
      })
      .finally(() => {
        this.enqueuing.delete(source);
      });
    this.enqueuing.set(source, saving);
    await saving;
  }

  runReady(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.processReady().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async processReady() {
    const ready = [...this.jobs.values()].filter(
      (job) => !job.failed && job.nextAttemptAt <= Date.now(),
    );
    let index = 0;
    const worker = async () => {
      while (!this.stopped && index < ready.length) {
        const job = ready[index++];
        try {
          const original = this.sourcePath(job.source);
          job.attempts += 1;
          // Persist the attempt before doing work, including across process restarts.
          await this.persist(job);
          if (!(await this.fileExists(original))) {
            await unlink(getImageThumbnailPath(original)).catch(
              () => undefined,
            );
          } else if (
            !(await this.fileExists(getImageThumbnailPath(original)))
          ) {
            await (this.options.generate ?? createImageThumbnail)(original);
          }
          await unlink(this.jobPath(job.source));
          this.jobs.delete(job.source);
        } catch (error) {
          job.failed = job.attempts >= this.options.maxAttempts;
          job.nextAttemptAt =
            Date.now() +
            this.options.retryDelayMs * 2 ** Math.max(0, job.attempts - 1);
          this.options.onError?.(
            `Thumbnail ${job.source}, attempt ${job.attempts}/${this.options.maxAttempts}${job.failed ? ' (failed)' : ''}: ${String(error)}`,
          );
          await this.persist(job).catch((persistError) =>
            this.options.onError?.(
              `Cannot persist thumbnail retry: ${String(persistError)}`,
            ),
          );
        }
      }
    };
    await Promise.all(Array.from({ length: this.options.concurrency }, worker));
  }

  private async fileExists(path: string) {
    try {
      return (await stat(path)).isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async stop() {
    this.stopped = true;
    await this.running;
  }
}
