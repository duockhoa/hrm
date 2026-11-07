import { PickType } from '@nestjs/mapped-types';
import { GetAuditLogsDto } from './get-audit-logs.dto';

// Resource endpoints choose the entity themselves; callers only control paging.
export class GetAuditLogPageDto extends PickType(GetAuditLogsDto, [
  'page',
  'limit',
] as const) {}
