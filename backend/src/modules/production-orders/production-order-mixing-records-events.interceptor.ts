import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { ProductionOrderMixingRecordsGateway } from './production-order-mixing-records.gateway';

@Injectable()
export class ProductionOrderMixingRecordsEventsInterceptor implements NestInterceptor {
  constructor(private readonly gateway: ProductionOrderMixingRecordsGateway) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const method = context
      .switchToHttp()
      .getRequest<{ method: string }>().method;
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) return next.handle();
    return next.handle().pipe(
      mergeMap(async (result: Record<string, unknown>) => {
        if (result)
          await this.gateway.notifyMutation(result, method === 'DELETE');
        return result;
      }),
    );
  }
}
