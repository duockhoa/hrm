import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateProductionSpecificationDto } from './dto/create-production-specification.dto';
import { UpdateProductionSpecificationDto } from './dto/update-production-specification.dto';
import { ProductionSpecificationsService } from './production-specifications.service';

@UseGuards(jwtAuthGuard)
@Controller('production-specifications')
export class ProductionSpecificationsController {
  constructor(
    private readonly productionSpecificationsService: ProductionSpecificationsService,
  ) {}

  @Get()
  async findAll() {
    return this.productionSpecificationsService.findAll();
  }

  @Get(':item_code')
  async findByItemCode(@Param('item_code') item_code: string) {
    return this.productionSpecificationsService.findByItemCode(item_code);
  }

  @Post()
  async create(
    @Body() createProductionSpecificationDto: CreateProductionSpecificationDto,
  ) {
    return this.productionSpecificationsService.create(
      createProductionSpecificationDto,
    );
  }

  @Put(':item_code')
  async update(
    @Param('item_code') item_code: string,
    @Body() updateProductionSpecificationDto: UpdateProductionSpecificationDto,
  ) {
    return this.productionSpecificationsService.update(
      item_code,
      updateProductionSpecificationDto,
    );
  }

  @Delete(':item_code')
  async delete(@Param('item_code') item_code: string) {
    return this.productionSpecificationsService.delete(item_code);
  }
}
