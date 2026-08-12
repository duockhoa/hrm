import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { VerifyResetPasswordOtpDto } from './verify-reset-password-otp.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto extends VerifyResetPasswordOtpDto {
  @ApiProperty({
    example: 'new-secure-password',
    minLength: 6,
    format: 'password',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
