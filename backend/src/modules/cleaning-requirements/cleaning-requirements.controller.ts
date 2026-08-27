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
import { CleaningRequirementsService } from './cleaning-requirements.service';
import { CreateCleaningRequirementDto } from './dto/create-cleaning-requirement.dto';
import { UpdateCleaningRequirementDto } from './dto/update-cleaning-requirement.dto';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CLEANING_REQUIREMENT_PERMISSIONS } from './cleaning-requirements.permissions';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('cleaning-requirements')
export class CleaningRequirementsController {
  constructor(
    private readonly cleaningRequirementsService: CleaningRequirementsService,
  ) {}

  @Get()
  @Permissions(CLEANING_REQUIREMENT_PERMISSIONS.LIST)
  async findAll() {
    return this.cleaningRequirementsService.findAll();
  }

  @Get(':id')
  @Permissions(CLEANING_REQUIREMENT_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.cleaningRequirementsService.findById(id);
  }

  @Post()
  @Permissions(CLEANING_REQUIREMENT_PERMISSIONS.CREATE)
  async create(
    @Body() dto: CreateCleaningRequirementDto,
    @Request() req: any,
  ) {
    return this.cleaningRequirementsService.create(dto, req.user);
  }

  @Patch(':id')
  @Permissions(CLEANING_REQUIREMENT_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCleaningRequirementDto,
  ) {
    return this.cleaningRequirementsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(CLEANING_REQUIREMENT_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.cleaningRequirementsService.delete(id);
  }
}
