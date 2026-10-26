import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckWeighingRecordLotDto {
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  is_correct: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lot_no: string;
}
