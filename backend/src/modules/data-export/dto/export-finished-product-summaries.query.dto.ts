import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ExportFinishedProductSummariesQueryDto {
  /** Only return records created or updated at/after this ISO 8601 timestamp. */
  @IsOptional()
  @IsDateString()
  updated_from?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit = 500;
}
