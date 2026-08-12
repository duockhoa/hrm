import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetPasswordOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã OTP gồm 6 chữ số được gửi qua email',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d+$/)
  otp!: string;
}
