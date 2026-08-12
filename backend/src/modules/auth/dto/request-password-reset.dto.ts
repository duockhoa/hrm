import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email của tài khoản cần đặt lại mật khẩu',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
