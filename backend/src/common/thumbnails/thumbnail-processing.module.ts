import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  Module,
  NestInterceptor,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { mergeMap } from 'rxjs';
import { resolve } from 'path';
import { ThumbnailQueue } from './thumbnail-queue';
import {
  ThumbnailUploadRequest,
  UPLOADED_THUMBNAIL_SOURCES,
} from '../utils/image-thumbnail.util';

const positiveInteger = (name: string, fallback: number, maximum: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > maximum)
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  return value;
};

@Injectable()
export class ThumbnailProcessingService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ThumbnailProcessingService.name);
  private readonly queue = new ThumbnailQueue({
    uploadsDirectory: resolve(process.cwd(), 'uploads'),
    concurrency: positiveInteger('IMAGE_THUMBNAIL_CONCURRENCY', 2, 8),
    maxAttempts: positiveInteger('IMAGE_THUMBNAIL_MAX_ATTEMPTS', 3, 10),
    retryDelayMs: positiveInteger(
      'IMAGE_THUMBNAIL_RETRY_DELAY_MS',
      1000,
      60000,
    ),
    onError: (message) => this.logger.error(message),
  });
  private timer?: ReturnType<typeof setInterval>;

  async onModuleInit() {
    await this.queue.initialize();
    this.timer = setInterval(() => {
      void this.queue.runReady().catch((error) => this.logger.error(error));
    }, 500);
    this.timer.unref();
  }

  async enqueue(paths: string[]) {
    for (const path of new Set(paths)) {
      try {
        await this.queue.enqueue(path);
      } catch (error) {
        // The DB save already succeeded. Keep serving the original; startup recovery
        // will rediscover missing thumbnails if queue persistence is temporarily down.
        this.logger.error(`Cannot queue thumbnail ${path}: ${String(error)}`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.queue.stop();
  }
}

@Injectable()
export class ThumbnailUploadInterceptor implements NestInterceptor {
  constructor(private readonly processing: ThumbnailProcessingService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<ThumbnailUploadRequest>();
    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        const paths = request[UPLOADED_THUMBNAIL_SOURCES];
        if (paths?.length) await this.processing.enqueue(paths);
        return response;
      }),
    );
  }
}

@Module({
  providers: [
    ThumbnailProcessingService,
    { provide: APP_INTERCEPTOR, useClass: ThumbnailUploadInterceptor },
  ],
})
export class ThumbnailProcessingModule {}
