import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiPropertyOptional({
    example: 'qc@example.com,qa@example.com',
    description: 'Người nhận trực tiếp khi không cung cấp emailTypeCode.',
  })
  recipients?: string | string[];

  @ApiPropertyOptional({
    example: 'sampling_request',
    description:
      'Nếu cung cấp, chọn người nhận theo cấu hình cá nhân, mặc định, rồi email người thao tác.',
  })
  emailTypeCode?: string;

  @ApiProperty({ example: 'Phiếu yêu cầu lấy mẫu' })
  subject!: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  html?: string;
}
