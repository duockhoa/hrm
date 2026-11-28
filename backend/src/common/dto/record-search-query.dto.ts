import { PickType } from '@nestjs/swagger';
import { RecordListQueryDto } from './record-list-query.dto';

export class RecordSearchQueryDto extends PickType(RecordListQueryDto, [
  'search',
] as const) {}
