import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmailFileDto {
  @ApiProperty({ example: 'sai-lech-123.html' })
  filename!: string;

  @ApiProperty({ example: 'text/html' })
  contentType!: string;

  @ApiProperty({ description: 'Nội dung tệp được mã hóa base64.' })
  contentBase64!: string;
}

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

  @ApiPropertyOptional({
    description: 'Ảnh nhúng, khóa tương ứng với src="cid:khóa" trong HTML.',
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  inlineImages?: Record<string, EmailFileDto>;

  @ApiPropertyOptional({ type: [EmailFileDto] })
  attachments?: EmailFileDto[];
}
