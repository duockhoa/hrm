import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { catchError } from 'rxjs';
import { removeUploadedProductionOrderWeighingRecordDetailImage } from './production-order-weighing-record-detail-upload.config';

// Wrap the upload interceptor as well as parameter/body pipes, so malformed
// route IDs cannot leave an uploaded file behind before the handler is called.
export class WeighingDetailUploadCleanupInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError(async (error: unknown) => {
        const request = context.switchToHttp().getRequest();
        const files: Express.Multer.File[] = [
          ...(request.file ? [request.file] : []),
          ...(Array.isArray(request.files)
            ? request.files
            : Object.values(request.files ?? {}).flat()),
        ];
        await Promise.all(
          files.map((file) =>
            removeUploadedProductionOrderWeighingRecordDetailImage(file).catch(
              () => undefined,
            ),
          ),
        );
        throw error;
      }),
    );
  }
}
