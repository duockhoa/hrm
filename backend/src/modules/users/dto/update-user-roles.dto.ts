import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddUserRolesDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'ID role đơn lẻ; không gửi cùng roleIds',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number;

  @ApiPropertyOptional({
    example: [2, 3],
    type: [Number],
    description: 'Danh sách ID role cần thêm',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds?: number[];
}

export class SyncUserRolesDto {
  @ApiProperty({
    example: [2, 3],
    type: [Number],
    description: 'Danh sách role thay thế toàn bộ role hiện có',
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds!: number[];
}
