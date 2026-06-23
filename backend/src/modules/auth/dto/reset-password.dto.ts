import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { VerifyResetPasswordOtpDto } from './verify-reset-password-otp.dto';

export class ResetPasswordDto extends VerifyResetPasswordOtpDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
