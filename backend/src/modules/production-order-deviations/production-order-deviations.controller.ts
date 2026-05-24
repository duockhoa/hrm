import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateProductionOrderDeviationDto } from './dto/create-production-order-deviation.dto';
import { UpdateProductionOrderDeviationDto } from './dto/update-production-order-deviation.dto';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';

@UseGuards(jwtAuthGuard)
@Controller('production-order-deviations')
export class ProductionOrderDeviationsController {
  constructor(
    private readonly productionOrderDeviationsService: ProductionOrderDeviationsService,
  ) {}

  @Get()
  async findAll(@Query('production_order_id') productionOrderId?: string) {
    return this.productionOrderDeviationsService.findAll(productionOrderId);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDeviationsService.findById(id);
  }

  @Post()
  async create(
    @Body()
    createProductionOrderDeviationDto: CreateProductionOrderDeviationDto,
  ) {
    return this.productionOrderDeviationsService.create(
      createProductionOrderDeviationDto,
    );
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateProductionOrderDeviationDto: UpdateProductionOrderDeviationDto,
  ) {
    return this.productionOrderDeviationsService.update(
      id,
      updateProductionOrderDeviationDto,
    );
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDeviationsService.delete(id);
  }
}
