import { ApiProperty } from '@nestjs/swagger';

export class CreateWarehouseTemperatureHumidityCheckDto {
  @ApiProperty({ maxLength: 255, example: 'Kho nguyên liệu - vị trí A1' })
  location: string;

  @ApiProperty({ example: 'Nhiệt độ 15–30 °C, độ ẩm không quá 75 %RH' })
  requirement: string;

  @ApiProperty({ example: 25.5, minimum: -999.99, maximum: 999.99 })
  temperature: number;

  @ApiProperty({ example: 65.2, minimum: 0, maximum: 100 })
  humidity: number;
}
