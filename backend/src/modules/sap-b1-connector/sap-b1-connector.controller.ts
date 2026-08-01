import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';
import { SapB1ConnectorService } from './sap-b1-connector.service';

@UseGuards(jwtAuthGuard)
@Controller('sap-b1-connector')
export class SapB1ConnectorController {
  constructor(
    private readonly sapB1Client: SapB1ServiceLayerClient,
    private readonly sapB1ConnectorService: SapB1ConnectorService,
  ) {}

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

  @Patch('production-orders/:id')
  async patchProductionOrderById(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.sapB1ConnectorService.patchProductionOrderById(id, body);
  }

  @Get('unit-of-measurements')
  async getUnitOfMeasurements() {
    return this.sapB1Client.getUnitOfMeasurements();
  }
}
