import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { RecordListQueryDto, trimQueryText } from './record-list-query.dto';
export class WmsListQueryDto extends RecordListQueryDto {
  @IsOptional()
  @Matches(/^-?\d{1,3}(?:\.\d{1,2})?$/)
  temperature_min?: string;
  @IsOptional()
  @Matches(/^-?\d{1,3}(?:\.\d{1,2})?$/)
  temperature_max?: string;
  @IsOptional()
  @Matches(/^(?:\d{1,2}(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/)
  humidity_min?: string;
  @IsOptional()
  @Matches(/^(?:\d{1,2}(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/)
  humidity_max?: string;
  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  item_name?: string;
  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(100)
  lot_number?: string;
  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  order_code?: string;
  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  created_by?: string;
  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  location?: string;
  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  requirement?: string;
  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  checked_by?: string;
  @IsOptional()
  @IsIn(['pass', 'fail', 'unrecorded'])
  result?: string;
  @IsOptional()
  @IsIn(['sent', 'not_sent'])
  sampling_status?: string;
  @IsOptional()
  @IsIn(['confirmed', 'not_confirmed'])
  warehouse_status?: string;
}
