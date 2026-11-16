import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { trimQueryText } from '../../../common/dto/record-list-query.dto';

export class SaveReceiptSamplingDraftDto {
  @ApiProperty({ maxLength: 191, description: 'Vị trí lấy mẫu' })
  @Transform(trimQueryText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  location: string;
}
