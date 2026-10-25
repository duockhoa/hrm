import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CheckWeighingRecordLotDto {
  @IsBoolean()
  is_correct: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lot_no: string;
}
