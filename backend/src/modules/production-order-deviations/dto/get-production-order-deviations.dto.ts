import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RecordListQueryDto,
  trimQueryText,
} from '../../../common/dto/record-list-query.dto';

export class GetProductionOrderDeviationsDto extends RecordListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  reporter_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  approver_id?: number;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  cause_classification?: string;

  @IsOptional()
  @IsIn(['created_at', 'updated_at'])
  date_field?: 'created_at' | 'updated_at';
}
