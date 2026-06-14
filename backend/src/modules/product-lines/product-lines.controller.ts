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
import { CreateProductLineDto } from './dto/create-product-line.dto';
import { UpdateProductLineDto } from './dto/update-product-line.dto';
import { ProductLinesService } from './product-lines.service';

@UseGuards(jwtAuthGuard)
@Controller('product-lines')
export class ProductLinesController {
  constructor(private readonly productLinesService: ProductLinesService) {}

  @Get()
  async findAll() {
    return this.productLinesService.findAll();
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.productLinesService.findByCode(code);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productLinesService.findById(id);
  }

  @Post()
  async create(@Body() createProductLineDto: CreateProductLineDto) {
    return this.productLinesService.create(createProductLineDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductLineDto: UpdateProductLineDto,
  ) {
    return this.productLinesService.update(id, updateProductLineDto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.productLinesService.delete(id);
  }
}
