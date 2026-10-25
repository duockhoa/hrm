import { ProductionOrderWeighingRecordsEventsInterceptor } from './production-order-weighing-records-events.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';
import { CreateProductionOrderWeighingRecordLineDto } from './dto/create-production-order-weighing-record-line.dto';
import { UpdateProductionOrderWeighingRecordLineDto } from './dto/update-production-order-weighing-record-line.dto';
import { ProductionOrderWeighingRecordLinesService } from './production-order-weighing-record-lines.service';

@UseInterceptors(ProductionOrderWeighingRecordsEventsInterceptor)
@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-orders/weighing-records/:recordId/lines')
export class ProductionOrderWeighingRecordLinesController {
  constructor(
    private readonly service: ProductionOrderWeighingRecordLinesService,
  ) {}

  @Get()
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  findAll(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.service.findAll(recordId);
  }

  @Get(':lineId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  findById(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
  ) {
    return this.service.findById(recordId, lineId);
  }

  @Post()
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  create(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: CreateProductionOrderWeighingRecordLineDto,
  ) {
    return this.service.create(recordId, dto);
  }

  @Patch(':lineId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  update(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: UpdateProductionOrderWeighingRecordLineDto,
  ) {
    return this.service.update(recordId, lineId, dto);
  }

  @Delete(':lineId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.DELETE)
  delete(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
  ) {
    return this.service.delete(recordId, lineId);
  }
}
