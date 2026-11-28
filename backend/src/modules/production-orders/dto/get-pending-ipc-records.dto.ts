import { PickType } from '@nestjs/swagger';
import { RecordListQueryDto } from 'src/common/dto/record-list-query.dto';

export class GetPendingIpcRecordsDto extends PickType(RecordListQueryDto, [
  'search',
  'page',
  'limit',
] as const) {}
