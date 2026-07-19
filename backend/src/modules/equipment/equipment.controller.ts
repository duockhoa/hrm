import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateEquipmentMonitoringRecordDto } from './dto/create-equipment-monitoring-record.dto';
import { CreateEquipmentParameterDto } from './dto/create-equipment-parameter.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentMonitoringRecordDto } from './dto/update-equipment-monitoring-record.dto';
import { UpdateEquipmentParameterDto } from './dto/update-equipment-parameter.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentMonitoringRecordsService } from './equipment-monitoring-records.service';
import { EquipmentParametersService } from './equipment-parameters.service';
import { EquipmentService } from './equipment.service';

@UseGuards(jwtAuthGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly equipmentParametersService: EquipmentParametersService,
    private readonly equipmentMonitoringRecordsService: EquipmentMonitoringRecordsService,
  ) {}

  @Get()
  async findAll() {
    return this.equipmentService.findAll();
  }

  @Get('monitoring-records')
  async findMonitoringRecords(
    @Query()
    query: {
      production_order_id?: string;
      equipment_id?: string;
    },
  ) {
    return this.equipmentMonitoringRecordsService.findAll(query);
  }

  @Get('monitoring-records/:recordId')
  async findMonitoringRecordById(
    @Param('recordId', ParseIntPipe) recordId: number,
  ) {
    return this.equipmentMonitoringRecordsService.findById(recordId);
  }

  @Post('monitoring-records')
  async createMonitoringRecord(
    @Body() createDto: CreateEquipmentMonitoringRecordDto,
    @Request() req: any,
  ) {
    return this.equipmentMonitoringRecordsService.create(createDto, req.user);
  }

  @Patch('monitoring-records/:recordId')
  async updateMonitoringRecord(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() updateDto: UpdateEquipmentMonitoringRecordDto,
  ) {
    return this.equipmentMonitoringRecordsService.update(recordId, updateDto);
  }

  @Delete('monitoring-records/:recordId')
  async deleteMonitoringRecord(
    @Param('recordId', ParseIntPipe) recordId: number,
  ) {
    return this.equipmentMonitoringRecordsService.delete(recordId);
  }

  @Get('parameters/:parameterId')
  async findParameterById(
    @Param('parameterId', ParseIntPipe) parameterId: number,
  ) {
    return this.equipmentParametersService.findById(parameterId);
  }

  @Patch('parameters/:parameterId')
  async updateParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Body() updateDto: UpdateEquipmentParameterDto,
  ) {
    return this.equipmentParametersService.update(parameterId, updateDto);
  }

  @Delete('parameters/:parameterId')
  async deleteParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
  ) {
    return this.equipmentParametersService.delete(parameterId);
  }

  @Get(':id/parameters')
  async findParameters(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentParametersService.findAllByEquipment(id);
  }

  @Post(':id/parameters')
  async createParameter(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateEquipmentParameterDto,
    @Request() req: any,
  ) {
    return this.equipmentParametersService.create(id, createDto, req.user);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentService.findById(id);
  }

  @Post()
  async create(@Body() createDto: CreateEquipmentDto, @Request() req: any) {
    return this.equipmentService.create(createDto, req.user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentService.delete(id);
  }
}
