import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateProductionWorkshopDto } from './dto/create-production-workshop.dto';
import { UpdateProductionWorkshopDto } from './dto/update-production-workshop.dto';
import { ProductionWorkshopsService } from './production-workshops.service';

@UseGuards(jwtAuthGuard)
@Controller('production-workshops')
export class ProductionWorkshopsController {
  constructor(
    private readonly productionWorkshopsService: ProductionWorkshopsService,
  ) {}

  @Get()
  async findAll() {
    return this.productionWorkshopsService.findAll();
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
