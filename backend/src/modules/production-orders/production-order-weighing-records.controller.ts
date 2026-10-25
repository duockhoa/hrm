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
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateProductionOrderWeighingRecordDto } from './dto/create-production-order-weighing-record.dto';
import { UpdateProductionOrderWeighingRecordDto } from './dto/update-production-order-weighing-record.dto';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';
import { ProductionOrderWeighingRecordsService } from './production-order-weighing-records.service';

@UseInterceptors(ProductionOrderWeighingRecordsEventsInterceptor)
@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-orders')
export class ProductionOrderWeighingRecordsController {
  constructor(
    private readonly service: ProductionOrderWeighingRecordsService,
  ) {}

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  @Get('weighing-records/:recordId')
  findById(@Param('recordId', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('weighing-records/:recordId')
  update(
    @Param('recordId', ParseIntPipe) id: number,
    @Body() dto: UpdateProductionOrderWeighingRecordDto,
  ) {
    return this.service.update(id, dto);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.DELETE)
  @Delete('weighing-records/:recordId')
  delete(@Param('recordId', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('weighing-records/:recordId/qa-staff-approval')
  approveByQaStaff(
    @Param('recordId', ParseIntPipe) id: number,
    @Request() req: { user: { id?: number | string | null } },
  ) {
    return this.service.approveByQaStaff(id, req.user);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('weighing-records/:recordId/ipc-staff-approval')
  approveByIpcStaff(
    @Param('recordId', ParseIntPipe) id: number,
    @Request() req: { user: { id?: number | string | null } },
  ) {
    return this.service.approveByIpcStaff(id, req.user);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  @Get(':id/weighing-records')
  findAllByProductionOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.findAllByProductionOrder(id);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  @Post(':id/weighing-records')
  create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductionOrderWeighingRecordDto,
    @Request() req: { user: { id?: number | string | null } },
  ) {
    return this.service.create(id, dto, req.user);
  }
}
