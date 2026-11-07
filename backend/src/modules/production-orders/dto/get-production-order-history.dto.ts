import { IsIn, IsOptional } from 'class-validator';
import { GetAuditLogPageDto } from '../../audit-logs/dto/get-audit-log-page.dto';

export class GetProductionOrderHistoryDto extends GetAuditLogPageDto {
  @IsOptional()
  @IsIn(['record', 'production-order'])
  scope?: 'record' | 'production-order';
}
