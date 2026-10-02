import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateWarehouseTemperatureHumidityCheckDto } from './dto/create-warehouse-temperature-humidity-check.dto';
import { UpdateWarehouseTemperatureHumidityCheckDto } from './dto/update-warehouse-temperature-humidity-check.dto';
import { WarehouseTemperatureHumidityChecksService } from './warehouse-temperature-humidity-checks.service';

@ApiTags('warehouse-temperature-humidity-checks')
@UseGuards(jwtAuthGuard)
@Controller('warehouse-temperature-humidity-checks')
export class WarehouseTemperatureHumidityChecksController {
  constructor(
    private readonly service: WarehouseTemperatureHumidityChecksService,
  ) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(
    @Body() dto: CreateWarehouseTemperatureHumidityCheckDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseTemperatureHumidityCheckDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
