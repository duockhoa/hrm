import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateEquipmentIncidentReportDto } from './dto/create-equipment-incident-report.dto';
import { UpdateEquipmentIncidentReportDto } from './dto/update-equipment-incident-report.dto';
import { EquipmentIncidentReportsService } from './equipment-incident-reports.service';
import { EQUIPMENT_PERMISSIONS } from './equipment.permissions';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('equipment/incident-reports')
export class EquipmentIncidentReportsController {
  constructor(
    private readonly equipmentIncidentReportsService: EquipmentIncidentReportsService,
  ) {}

  @Get()
  @Permissions(EQUIPMENT_PERMISSIONS.LIST)
  async findAll(
    @Query()
    query: {
      equipment_id?: string;
      status?: string;
      priority?: string;
    },
  ) {
    return this.equipmentIncidentReportsService.findAll(query);
  }

  @Get(':id')
  @Permissions(EQUIPMENT_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentIncidentReportsService.findById(id);
  }

  @Post()
  @Permissions(EQUIPMENT_PERMISSIONS.CREATE)
  async create(
    @Body() dto: CreateEquipmentIncidentReportDto,
    @Request() request: { user?: { id?: number | string | null } },
  ) {
    return this.equipmentIncidentReportsService.create(dto, request.user);
  }

  @Patch(':id')
  @Permissions(EQUIPMENT_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipmentIncidentReportDto,
  ) {
    return this.equipmentIncidentReportsService.update(id, dto);
  }
}
