import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { ITEM_PERMISSIONS } from '../items/items.permissions';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';
import { SapB1ConnectorService } from './sap-b1-connector.service';
import { ApiBody } from '@nestjs/swagger';

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

  @Post('items/sync')
  @HttpCode(HttpStatus.OK)
  @Permissions(ITEM_PERMISSIONS.UPDATE)
  @UseGuards(PermissionsGuard, NetworkPolicyGuard)
  async syncItems() {
    return this.sapB1ConnectorService.syncItems();
  }

  @Post('suppliers/sync')
  @HttpCode(HttpStatus.OK)
  @Permissions(ITEM_PERMISSIONS.UPDATE)
  @UseGuards(PermissionsGuard, NetworkPolicyGuard)
  async syncSuppliers() {
    return this.sapB1ConnectorService.syncSuppliers();
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
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      description:
        'Các trường cần cập nhật được chuyển tiếp tới SAP Business One Service Layer.',
      example: { Status: 'bost_Open' },
    },
  })
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
