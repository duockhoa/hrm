import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateFilterCatalogDto } from './dto/create-filter-catalog.dto';
import { FILTER_CATALOG_PERMISSIONS } from './filter-catalogs.permissions';
import { UpdateFilterCatalogDto } from './dto/update-filter-catalog.dto';
import { FilterCatalogsService } from './filter-catalogs.service';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('filter-catalogs')
export class FilterCatalogsController {
  constructor(private readonly filterCatalogsService: FilterCatalogsService) {}

  @Get()
  @Permissions(FILTER_CATALOG_PERMISSIONS.LIST)
  async findAll() {
    return this.filterCatalogsService.findAll();
  }

  @Get(':id')
  @Permissions(FILTER_CATALOG_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.filterCatalogsService.findById(id);
  }

  @Post()
  @Permissions(FILTER_CATALOG_PERMISSIONS.CREATE)
  async create(@Body() dto: CreateFilterCatalogDto, @Request() req: any) {
    return this.filterCatalogsService.create(dto, req.user);
  }

  @Patch(':id')
  @Permissions(FILTER_CATALOG_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFilterCatalogDto,
  ) {
    return this.filterCatalogsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(FILTER_CATALOG_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.filterCatalogsService.delete(id);
  }
}
