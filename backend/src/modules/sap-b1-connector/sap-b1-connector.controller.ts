import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';

@UseGuards(jwtAuthGuard)
@Controller('sap-b1-connector')
export class SapB1ConnectorController {
  constructor(private readonly sapB1Client: SapB1ServiceLayerClient) {}

  @Get('items')
  async getItems() {
    return this.sapB1Client.getItems();
  }

  @Get('production-orders')
  async getProductionOrders() {
    return this.sapB1Client.getProductionOrders();
  }

  @Get('production-orders/:id')
  async getProductionOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.sapB1Client.getProductionOrderById(id);
  }

  @Get('unit-of-measurements')
  async getUnitOfMeasurements() {
    return this.sapB1Client.getUnitOfMeasurements();
  }
}
