import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DEPARTMENT_PERMISSIONS } from './departments.permissions';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Permissions(DEPARTMENT_PERMISSIONS.LIST)
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':name')
  @Permissions(DEPARTMENT_PERMISSIONS.READ)
  async findByName(@Param('name') name: string) {
    return this.departmentsService.findByName(name);
  }

  @Post()
  @Permissions(DEPARTMENT_PERMISSIONS.CREATE)
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Delete(':name')
  @Permissions(DEPARTMENT_PERMISSIONS.DELETE)
  async delete(@Param('name') name: string) {
    return this.departmentsService.delete(name);
  }

  @Put(':name')
  @Permissions(DEPARTMENT_PERMISSIONS.UPDATE)
  async update(
    @Param('name') name: string,
    @Body() updateDepartmentDto: CreateDepartmentDto,
  ) {
    return this.departmentsService.update(name, updateDepartmentDto);
  }
}
