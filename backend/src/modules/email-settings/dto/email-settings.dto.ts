import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateEmailTypeDto {
  @ApiProperty({ example: 'sampling_request' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/)
  code!: string;

  @ApiProperty({ example: 'Phiếu yêu cầu lấy mẫu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

export class UpdateEmailTypeDto {
  @ApiProperty({ example: 'Phiếu yêu cầu lấy mẫu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

export class SaveEmailRecipientsDto {
  @ApiProperty({
    example: 'qc@example.com qa@example.com',
    description:
      'Địa chỉ email ngăn cách bằng dấu cách; vẫn nhận dấu phẩy cho dữ liệu cũ. Chuỗi rỗng để xóa cấu hình.',
  })
  @IsString()
  @MaxLength(65535)
  email!: string;
}

export class DefaultEmailAddressDto {
  @ApiProperty({ example: 'qc@example.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;
}

export class UpdateDefaultEmailAddressDto extends DefaultEmailAddressDto {
  @ApiProperty({ example: 'qa@example.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  newEmail!: string;
}
