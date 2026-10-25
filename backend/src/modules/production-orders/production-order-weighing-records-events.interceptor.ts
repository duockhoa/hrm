import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { ProductionOrderWeighingRecordsGateway } from './production-order-weighing-records.gateway';

@Injectable()
export class ProductionOrderWeighingRecordsEventsInterceptor implements NestInterceptor {
  constructor(
    private readonly gateway: ProductionOrderWeighingRecordsGateway,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; params?: { recordId?: string } }>();
    if (!['POST', 'PATCH', 'DELETE'].includes(request.method))
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result: Record<string, unknown> | unknown[]) => {
        if (!result) return result;
        const header =
          !Array.isArray(result) && 'production_order_id' in result;
        const recordId = Number(
          request.params?.recordId ?? (header ? result.id : undefined),
        );
        if (Number.isSafeInteger(recordId) && recordId > 0) {
          await this.gateway.notifyMutation(
            recordId,
            request.method === 'DELETE' && header,
          );
        }
        return result;
      }),
    );
  }
}
