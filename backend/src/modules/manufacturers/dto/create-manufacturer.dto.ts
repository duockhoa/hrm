import { ApiProperty } from '@nestjs/swagger';

export class CreateManufacturerDto {
  @ApiProperty({ example: 'Nhà sản xuất A', maxLength: 255 })
  manufacturer_name: string;
}
