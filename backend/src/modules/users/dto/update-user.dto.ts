import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, ValidateIf } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: ['OPEN', 'IP_ALLOWLIST'] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['OPEN', 'IP_ALLOWLIST'])
  network_policy_code?: 'OPEN' | 'IP_ALLOWLIST';
}
