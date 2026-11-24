import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSapProductionReceiptDto {
  @IsUUID('4')
  requestId!: string;

  @Matches(datePattern)
  @IsDateString({ strict: true })
  postingDate!: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @Transform(trim)
  @Matches(/\S/)
  @MaxLength(8)
  warehouseCode!: string;

  @Transform(trim)
  @Matches(/\S/)
  @MaxLength(36)
  lotNumber!: string;

  @Matches(datePattern)
  @IsDateString({ strict: true })
  manufacturingDate!: string;

  @Matches(datePattern)
  @IsDateString({ strict: true })
  expiryDate!: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/\S/)
  @MaxLength(8)
  departmentCode?: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/\S/)
  @MaxLength(8)
  costItemCode?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(254)
  comments?: string;
}
