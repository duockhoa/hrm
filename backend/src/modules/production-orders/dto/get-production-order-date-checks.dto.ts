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

export class GetProductionOrderDateChecksDto extends RecordListQueryDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  approval_status?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(191)
  package_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  created_by_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  approved_by_id?: number;

  @IsOptional()
  @IsIn(['true', 'false'])
  has_images?: string;

  @IsOptional()
  @IsIn(['created_at', 'updated_at', 'checked_at', 'approved_at'])
  date_field?: 'created_at' | 'updated_at' | 'checked_at' | 'approved_at';
}
