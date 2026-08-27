import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class SyncApplicationUsersDto {
  @ApiProperty({
    example: [1, 2],
    type: [Number],
    description: 'Danh sách user thay thế toàn bộ user của application',
  })
  @IsArray()
  @IsInt({ each: true })
  userIds!: number[];
}
