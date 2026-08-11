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
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateProductLineDto } from './dto/create-product-line.dto';
import { UpdateProductLineDto } from './dto/update-product-line.dto';
import { PRODUCT_LINE_PERMISSIONS } from './product-lines.permissions';
import { ProductLinesService } from './product-lines.service';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('product-lines')
export class ProductLinesController {
  constructor(private readonly productLinesService: ProductLinesService) {}

  @Get()
  @Permissions(PRODUCT_LINE_PERMISSIONS.LIST)
  async findAll() {
    return this.productLinesService.findAll();
  }

  @Get('code/:code')
  @Permissions(PRODUCT_LINE_PERMISSIONS.READ)
  async findByCode(@Param('code') code: string) {
    return this.productLinesService.findByCode(code);
  }

  @Get(':id')
  @Permissions(PRODUCT_LINE_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productLinesService.findById(id);
  }

  @Post()
  @Permissions(PRODUCT_LINE_PERMISSIONS.CREATE)
  async create(@Body() createProductLineDto: CreateProductLineDto) {
    return this.productLinesService.create(createProductLineDto);
  }

  @Put(':id')
  @Permissions(PRODUCT_LINE_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductLineDto: UpdateProductLineDto,
  ) {
    return this.productLinesService.update(id, updateProductLineDto);
  }

  @Delete(':id')
  @Permissions(PRODUCT_LINE_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.productLinesService.delete(id);
  }
}
