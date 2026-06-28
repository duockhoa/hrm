import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateProductionWorkshopPressureDifferentialDto } from './dto/create-production-workshop-pressure-differential.dto';
import { CreateProductionWorkshopDto } from './dto/create-production-workshop.dto';
import { UpdateProductionWorkshopPressureDifferentialDto } from './dto/update-production-workshop-pressure-differential.dto';
import { UpdateProductionWorkshopDto } from './dto/update-production-workshop.dto';
import { ProductionWorkshopPressureDifferentialsService } from './production-workshop-pressure-differentials.service';
import { ProductionWorkshopsService } from './production-workshops.service';

@UseGuards(jwtAuthGuard)
@Controller('production-workshops')
export class ProductionWorkshopsController {
  constructor(
    private readonly productionWorkshopsService: ProductionWorkshopsService,
    private readonly productionWorkshopPressureDifferentialsService: ProductionWorkshopPressureDifferentialsService,
  ) {}

  @Get()
  async findAll() {
    return this.productionWorkshopsService.findAll();
  }

  @Get('pressure-differentials/:pressureDifferentialId')
  async findPressureDifferentialById(
    @Param('pressureDifferentialId', ParseIntPipe)
    pressureDifferentialId: number,
  ) {
    return this.productionWorkshopPressureDifferentialsService.findById(
      pressureDifferentialId,
    );
  }

  @Put('pressure-differentials/:pressureDifferentialId')
  async updatePressureDifferential(
    @Param('pressureDifferentialId', ParseIntPipe)
    pressureDifferentialId: number,
    @Body() updateDto: UpdateProductionWorkshopPressureDifferentialDto,
  ) {
    return this.productionWorkshopPressureDifferentialsService.update(
      pressureDifferentialId,
      updateDto,
    );
  }

  @Delete('pressure-differentials/:pressureDifferentialId')
  async deletePressureDifferential(
    @Param('pressureDifferentialId', ParseIntPipe)
    pressureDifferentialId: number,
  ) {
    return this.productionWorkshopPressureDifferentialsService.delete(
      pressureDifferentialId,
    );
  }

  @Get(':id/pressure-differentials')
  async findPressureDifferentials(@Param('id', ParseIntPipe) id: number) {
    return this.productionWorkshopPressureDifferentialsService.findAllByProductionWorkshop(
      id,
    );
  }

  @Post(':id/pressure-differentials')
  async createPressureDifferential(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionWorkshopPressureDifferentialDto,
    @Request() req: any,
  ) {
    return this.productionWorkshopPressureDifferentialsService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productionWorkshopsService.findById(id);
  }

  @Post()
  async create(@Body() createDto: CreateProductionWorkshopDto) {
    return this.productionWorkshopsService.create(createDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductionWorkshopDto,
  ) {
    return this.productionWorkshopsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.productionWorkshopsService.delete(id);
  }
}
