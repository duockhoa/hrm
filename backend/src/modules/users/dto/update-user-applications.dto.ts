import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncUserApplicationsDto {
  @ApiProperty({
    example: [1, 2],
    type: [Number],
    description: 'Danh sách application thay thế toàn bộ application hiện có',
  })
  @IsArray()
  @IsInt({ each: true })
  applicationIds!: number[];
}
