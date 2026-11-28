import { PickType } from '@nestjs/swagger';
import { GetProductionOrderListDto } from './get-production-order-list.dto';

export class GetPendingIpcRecordsDto extends PickType(GetProductionOrderListDto, [
  'search',
  'page',
  'limit',
  'item_code',
  'item_name',
  'lot_number',
  'from_date',
  'to_date',
] as const) {}
