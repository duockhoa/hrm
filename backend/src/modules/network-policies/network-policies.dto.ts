import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AssignNetworkPolicyDto {
  @ApiProperty({ enum: ['OPEN', 'IP_ALLOWLIST'] })
  @IsIn(['OPEN', 'IP_ALLOWLIST'])
  code!: 'OPEN' | 'IP_ALLOWLIST';
}

export class NetworkRangeDto {
  @ApiProperty({ example: 'Nhà máy A' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '203.0.113.10/32' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cidr!: string;
}
