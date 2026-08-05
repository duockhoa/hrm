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
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateFilterCatalogDto } from './dto/create-filter-catalog.dto';
import { UpdateFilterCatalogDto } from './dto/update-filter-catalog.dto';
import { FilterCatalogsService } from './filter-catalogs.service';

@UseGuards(jwtAuthGuard)
@Controller('filter-catalogs')
export class FilterCatalogsController {
  constructor(private readonly filterCatalogsService: FilterCatalogsService) {}

  @Get()
  async findAll() {
    return this.filterCatalogsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.filterCatalogsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateFilterCatalogDto, @Request() req: any) {
    return this.filterCatalogsService.create(dto, req.user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFilterCatalogDto,
  ) {
    return this.filterCatalogsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.filterCatalogsService.delete(id);
  }
}
