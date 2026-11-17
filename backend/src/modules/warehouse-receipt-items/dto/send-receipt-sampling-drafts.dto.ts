import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendReceiptSamplingDraftsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  requestId: string;
}
