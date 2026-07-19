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
import { CreateEquipmentParameterDto } from './dto/create-equipment-parameter.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentParameterDto } from './dto/update-equipment-parameter.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentParametersService } from './equipment-parameters.service';
import { EquipmentService } from './equipment.service';

@UseGuards(jwtAuthGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly equipmentParametersService: EquipmentParametersService,
  ) {}

  @Get()
  async findAll() {
    return this.equipmentService.findAll();
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
