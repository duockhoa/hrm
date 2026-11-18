import { PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  RecordListQueryDto,
  trimQueryText,
} from '../../common/dto/record-list-query.dto';

export class ListWarehouseStocktakesDto extends PickType(RecordListQueryDto, [
  'search',
  'page',
  'limit',
] as const) {}

export class CreateWarehouseStocktakeDto {
  @Matches(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  stocktake_date!: string;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(2000)
  note?: string;
}
