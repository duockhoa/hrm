import { PartialType } from '@nestjs/swagger';
import { CreateWarehouseTemperatureHumidityCheckDto } from './create-warehouse-temperature-humidity-check.dto';

export class UpdateWarehouseTemperatureHumidityCheckDto extends PartialType(
  CreateWarehouseTemperatureHumidityCheckDto,
) {}
