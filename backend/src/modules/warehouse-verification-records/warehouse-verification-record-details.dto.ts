import { PartialType } from '@nestjs/swagger';
import { WarehouseVerificationDefectType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimQueryText } from 'src/common/dto/record-list-query.dto';
import {
  parseVerificationId,
  VerificationRecordIdDto,
} from './warehouse-verification-records.dto';

const quantityPattern = /^\d{1,9}(?:\.\d{1,3})?$/;
const quantityText = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : trimQueryText({ value });

export class VerificationDetailParamsDto extends VerificationRecordIdDto {
  @Transform(parseVerificationId)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  detailId!: number;
}

export class CreateVerificationDetailDto {
  @Transform(quantityText)
  @Matches(quantityPattern, {
    message:
      'Số lượng xác minh phải có tối đa 9 chữ số nguyên và 3 chữ số thập phân.',
  })
  verified_quantity!: string;

  @Transform(trimQueryText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  defect_description!: string;

  @Transform(quantityText)
  @Matches(quantityPattern, {
    message:
      'Số lượng lỗi phải có tối đa 9 chữ số nguyên và 3 chữ số thập phân.',
  })
  defect_quantity!: string;

  @IsEnum(WarehouseVerificationDefectType)
  defect_type!: WarehouseVerificationDefectType;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(10000)
  proposed_action?: string | null;

  @IsOptional()
  @Transform(trimQueryText)
  @IsString()
  @MaxLength(10000)
  note?: string | null;
}

export class UpdateVerificationDetailDto extends PartialType(
  CreateVerificationDetailDto,
  { skipNullProperties: false },
) {}
