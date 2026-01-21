import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { UseGuards } from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { CreateDepartmentDto } from './dto/create-department.dto';

@UseGuards(jwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}
  @Get()
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':name')
  async findByName(@Param('name') name: string) {
    console.log('Controller: Finding department by name:', name);
    return this.departmentsService.findByName(name);
  }

  @Post()
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }
}
