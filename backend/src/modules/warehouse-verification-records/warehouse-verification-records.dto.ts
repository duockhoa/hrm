import { PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  RecordListQueryDto,
  trimQueryText,
} from 'src/common/dto/record-list-query.dto';

const MAX_ID = 2147483647;
export const parseVerificationId = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
const subjectTypes = ['receipt', 'production_order'] as const;
export type VerificationSubjectType = (typeof subjectTypes)[number];

export class VerificationListQueryDto extends PickType(RecordListQueryDto, [
  'search',
  'page',
  'limit',
] as const) {}

export class VerificationSubjectsQueryDto extends VerificationListQueryDto {
  @IsIn(subjectTypes)
  type!: VerificationSubjectType;
}

export class VerificationRecordIdDto {
  @Transform(parseVerificationId)
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  id!: number;
}

export class CreateVerificationRecordDto {
  @Transform(trimQueryText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  warehouse_receipt_item_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  production_order_id?: number | null;

  @ValidateIf((_dto, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_ID, { each: true })
  participant_user_ids?: number[];
}
