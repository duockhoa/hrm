import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'nguyen.van.a' })
  username!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  name!: string;

  @ApiPropertyOptional({ example: 'nguyen.van.a@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: 'QA' })
  department?: string | null;

  @ApiPropertyOptional({ example: 'Nhân viên' })
  position?: string | null;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: '2026-08-12T13:00:00.000Z', format: 'date-time' })
  created_at!: Date;

  @ApiProperty({ example: '2026-08-12T13:00:00.000Z', format: 'date-time' })
  updated_at!: Date;
}

export class PermissionKeysResponseDto {
  @ApiProperty({ example: ['users.read', 'users.update'], type: [String] })
  permissionKeys!: string[];
}

export class PasswordChangedResponseDto {
  @ApiProperty({ description: 'Mật khẩu đã được băm sau khi thay đổi' })
  hashedPassword!: string;
}
