import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(jwtAuthGuard)
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  @Get()
  async findAll() {
    return this.productionOrdersService.findAll();
  }

  @Get(':id')
  async findProductionOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrdersService.findProductionOrderById(id);
  }
}
