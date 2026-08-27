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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-copanies.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { COMPANY_PERMISSIONS } from './companies.permissions';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Permissions(COMPANY_PERMISSIONS.LIST)
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @Permissions(COMPANY_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.findById(id);
  }

  @Post()
  @Permissions(COMPANY_PERMISSIONS.CREATE)
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Delete(':id')
  @Permissions(COMPANY_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.delete(id);
  }

  @Put(':id')
  @Permissions(COMPANY_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, updateCompanyDto);
  }
}
