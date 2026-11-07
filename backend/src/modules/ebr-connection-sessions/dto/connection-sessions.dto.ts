import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GetConnectionSessionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsIn(['connected', 'reconnecting', 'ended'])
  status?: 'connected' | 'reconnecting' | 'ended';

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  connected_from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  connected_to?: string;
}

export class EndConnectionSessionDto {
  @IsUUID('4')
  client_session_id: string;
}
