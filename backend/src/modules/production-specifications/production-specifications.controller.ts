import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateProductionSpecificationDto } from './dto/create-production-specification.dto';
import { UpdateProductionSpecificationDto } from './dto/update-production-specification.dto';
import { PRODUCTION_SPECIFICATION_PERMISSIONS } from './production-specifications.permissions';
import { ProductionSpecificationsService } from './production-specifications.service';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-specifications')
export class ProductionSpecificationsController {
  constructor(
    private readonly productionSpecificationsService: ProductionSpecificationsService,
  ) {}

  @Get()
  @Permissions(PRODUCTION_SPECIFICATION_PERMISSIONS.LIST)
  async findAll() {
    return this.productionSpecificationsService.findAll();
  }

  @Get(':item_code')
  @Permissions(PRODUCTION_SPECIFICATION_PERMISSIONS.READ)
  async findByItemCode(@Param('item_code') item_code: string) {
    return this.productionSpecificationsService.findByItemCode(item_code);
  }

  @Post()
  @Permissions(PRODUCTION_SPECIFICATION_PERMISSIONS.CREATE)
  async create(
    @Body() createProductionSpecificationDto: CreateProductionSpecificationDto,
    @Request() req: any,
  ) {
    return this.productionSpecificationsService.create(
      createProductionSpecificationDto,
      req.user,
    );
  }

  @Put(':item_code')
  @Permissions(PRODUCTION_SPECIFICATION_PERMISSIONS.UPDATE)
  async update(
    @Param('item_code') item_code: string,
    @Body() updateProductionSpecificationDto: UpdateProductionSpecificationDto,
    @Request() req: any,
  ) {
    return this.productionSpecificationsService.update(
      item_code,
      updateProductionSpecificationDto,
      req.user,
    );
  }

  @Delete(':item_code')
  @Permissions(PRODUCTION_SPECIFICATION_PERMISSIONS.DELETE)
  async delete(@Param('item_code') item_code: string, @Request() req: any) {
    return this.productionSpecificationsService.delete(item_code, req.user);
  }
}
