import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'nguyen.van.a' })
  @IsString()
  @IsNotEmpty()
  username!: string;
  @ApiProperty({
    example: 'secure-password',
    format: 'password',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'nguyen.van.a@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Hà Nội' })
  address?: string;

  @ApiPropertyOptional({ example: 'QA' })
  department?: string;

  @ApiPropertyOptional({ example: 'Nhân viên' })
  position?: string;
}
