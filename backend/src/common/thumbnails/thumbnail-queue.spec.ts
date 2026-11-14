import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { ThumbnailQueue } from './thumbnail-queue';
import {
  getImageThumbnailPath,
  removeImageAndThumbnail,
} from '../utils/image-thumbnail.util';

describe('durable thumbnail queue', () => {
  let directory: string;
  let queue: ThumbnailQueue;
  const errors = jest.fn();
  const makeQueue = (generate?: (path: string) => Promise<unknown>) =>
    new ThumbnailQueue({
      uploadsDirectory: directory,
      concurrency: 2,
      maxAttempts: 3,
      retryDelayMs: 1000,
      generate,
      onError: errors,
    });
  const jobFiles = () => readdir(join(directory, '.thumbnail-jobs'));
  const readJob = async () =>
    JSON.parse(
      await readFile(
        join(directory, '.thumbnail-jobs', (await jobFiles())[0]),
        'utf8',
      ),
    );
  const source = async (name: string) => {
    const path = join(directory, name);
    await writeFile(path, 'sample');
    return path;
  };
  const eventually = async (check: () => boolean) => {
    for (let i = 0; i < 200 && !check(); i++)
      await new Promise((done) => setTimeout(done, 5));
    expect(check()).toBe(true);
  };

  beforeEach(async () => {
    errors.mockClear();
    directory = await mkdtemp(join(tmpdir(), 'hrm-thumbnail-queue-'));
  });
  afterEach(async () => {
    await queue?.stop();
    jest.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it('persists deduplicated jobs before encoding and creates real thumbnails later', async () => {
    queue = makeQueue();
    await queue.initialize();
    const path = join(directory, 'photo.jpg');
    await sharp({
      create: { width: 1000, height: 500, channels: 3, background: '#336699' },
    })
      .jpeg()
      .toFile(path);
    await Promise.all([queue.enqueue(path), queue.enqueue(path)]);
    expect(await jobFiles()).toHaveLength(1);
    await expect(stat(getImageThumbnailPath(path))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await queue.runReady();
    expect((await sharp(getImageThumbnailPath(path)).metadata()).width).toBe(
      640,
    );
    expect(await jobFiles()).toEqual([]);
  });

  it('limits concurrent encodes and overlapping worker ticks do not duplicate work', async () => {
    const releases: Array<() => void> = [];
    const generate = jest.fn(
      () => new Promise<void>((done) => releases.push(done)),
    );
    queue = makeQueue(generate);
    await queue.initialize();
    for (const name of ['a.jpg', 'b.jpg', 'c.jpg'])
      await queue.enqueue(await source(name));
    const running = queue.runReady();
    expect(queue.runReady()).toBe(running);
    await eventually(() => generate.mock.calls.length === 2);
    expect(generate).toHaveBeenCalledTimes(2);
    releases[0]();
    await eventually(() => generate.mock.calls.length === 3);
    releases[1]();
    releases[2]();
    await running;
    expect(await jobFiles()).toEqual([]);
  });

  it('retries with exponential backoff and retains terminal failures across restarts', async () => {
    let now = 10000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const generate = jest
      .fn()
      .mockRejectedValue(new Error('encoder unavailable'));
    queue = makeQueue(generate);
    await queue.initialize();
    await queue.enqueue(await source('photo.jpg'));
    await queue.runReady();
    expect(await readJob()).toMatchObject({
      attempts: 1,
      nextAttemptAt: 11000,
      failed: false,
    });
    await queue.runReady();
    expect(generate).toHaveBeenCalledTimes(1);
    now = 11000;
    await queue.runReady();
    expect(await readJob()).toMatchObject({
      attempts: 2,
      nextAttemptAt: 13000,
    });
    now = 13000;
    await queue.runReady();
    expect(await readJob()).toMatchObject({ attempts: 3, failed: true });
    await queue.stop();
    queue = makeQueue(generate);
    await queue.initialize();
    now = 30000;
    await queue.runReady();
    expect(generate).toHaveBeenCalledTimes(3);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('(failed)'));
  });

  it('does not exceed the attempt limit after a process exit during the last attempt', async () => {
    const generate = jest.fn();
    queue = makeQueue(generate);
    await queue.initialize();
    await queue.enqueue(await source('interrupted.jpg'));
    const filename = join(directory, '.thumbnail-jobs', (await jobFiles())[0]);
    await writeFile(
      filename,
      JSON.stringify({ ...(await readJob()), attempts: 3, failed: false }),
    );
    await queue.stop();
    queue = makeQueue(generate);
    await queue.initialize();
    await queue.runReady();
    expect(generate).not.toHaveBeenCalled();
    expect(await readJob()).toMatchObject({ attempts: 3, failed: true });
  });

  it('completes a transient failure on its next attempt', async () => {
    let now = 10000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const generate = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary IO error'))
      .mockResolvedValue(undefined);
    queue = makeQueue(generate);
    await queue.initialize();
    await queue.enqueue(await source('retry.jpg'));
    await queue.runReady();
    expect(await jobFiles()).toHaveLength(1);
    now = 11000;
    await queue.runReady();
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await jobFiles()).toEqual([]);
  });

  it('recovers pending jobs and originals missed between DB commit and enqueue', async () => {
    const generate = jest.fn().mockResolvedValue(undefined);
    queue = makeQueue(generate);
    await queue.initialize();
    await queue.enqueue(await source('pending.jpg'));
    await source('missed.jpg');
    await queue.stop();
    queue = makeQueue(generate);
    await queue.initialize();
    expect(await jobFiles()).toHaveLength(2);
    await queue.runReady();
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('drops deleted sources without retrying or recreating images', async () => {
    const generate = jest.fn();
    queue = makeQueue(generate);
    await queue.initialize();
    const path = await source('deleted.jpg');
    await queue.enqueue(path);
    await removeImageAndThumbnail(path);
    await queue.runReady();
    expect(generate).not.toHaveBeenCalled();
    expect(await jobFiles()).toEqual([]);
  });

  it('waits for active work on shutdown and leaves waiting jobs durable', async () => {
    const releases: Array<() => void> = [];
    const generate = jest.fn(
      () => new Promise<void>((done) => releases.push(done)),
    );
    queue = makeQueue(generate);
    await queue.initialize();
    for (const name of ['a.jpg', 'b.jpg', 'c.jpg'])
      await queue.enqueue(await source(name));
    const running = queue.runReady();
    await eventually(() => releases.length === 2);
    const stopping = queue.stop();
    releases.forEach((done) => done());
    await Promise.all([running, stopping]);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await jobFiles()).toHaveLength(1);
  });

  it('rejects paths outside upload storage', async () => {
    queue = makeQueue();
    await queue.initialize();
    await expect(
      queue.enqueue(join(directory, '..', 'outside.jpg')),
    ).rejects.toThrow('inside uploads');
  });
});
