import { IsIn, IsOptional } from 'class-validator';
import { GetAuditLogPageDto } from '../../audit-logs/dto/get-audit-log-page.dto';
import {
  LOT_HISTORY_CATEGORIES,
  type LotHistoryCategory,
} from '../production-order-history.resources';

export class GetProductionOrderHistoryDto extends GetAuditLogPageDto {
  @IsOptional()
  @IsIn(['record', 'production-order', 'lot'])
  scope?: 'record' | 'production-order' | 'lot';

  @IsOptional()
  @IsIn(LOT_HISTORY_CATEGORIES)
  category?: LotHistoryCategory;
}
