import { PickType } from '@nestjs/mapped-types';
import { GetProductionOrderListDto } from './get-production-order-list.dto';

export class GetFinishedProductSummariesDto extends PickType(
  GetProductionOrderListDto,
  ['search'] as const,
) {}
