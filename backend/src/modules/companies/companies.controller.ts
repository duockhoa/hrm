import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { UseGuards } from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@UseGuards(jwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}
  @Get()
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number) {
    return this.companiesService.findById(id);
  }

  @Post()
  async create(@Body() createCompanyDto: any) {
    return this.companiesService.create(createCompanyDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.companiesService.delete(id);
  }
  @Put(':id')
  async update(@Param('id') id: number, @Body() updateCompanyDto: any) {
    console.log('updateCompanyDto', updateCompanyDto);
    const idNumber = Number(id);
    return this.companiesService.update(idNumber, updateCompanyDto);
  }
}
