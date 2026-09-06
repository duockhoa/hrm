import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateProductionWorkshopPressureDifferentialDto } from './dto/create-production-workshop-pressure-differential.dto';
import { CreateProductionWorkshopCleaningChecklistDto } from './dto/create-production-workshop-cleaning-checklist.dto';
import { CreateProductionWorkshopDto } from './dto/create-production-workshop.dto';
import { UpdateProductionWorkshopCleaningChecklistDto } from './dto/update-production-workshop-cleaning-checklist.dto';
import { UpdateProductionWorkshopPressureDifferentialDto } from './dto/update-production-workshop-pressure-differential.dto';
import { UpdateProductionWorkshopDto } from './dto/update-production-workshop.dto';
import { ProductionWorkshopCleaningChecklistsService } from './production-workshop-cleaning-checklists.service';
import { ProductionWorkshopPressureDifferentialsService } from './production-workshop-pressure-differentials.service';
import { PRODUCTION_WORKSHOP_PERMISSIONS } from './production-workshops.permissions';
import { ProductionWorkshopsService } from './production-workshops.service';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-workshops')
export class ProductionWorkshopsController {
  constructor(
    private readonly productionWorkshopsService: ProductionWorkshopsService,
    private readonly productionWorkshopPressureDifferentialsService: ProductionWorkshopPressureDifferentialsService,
    private readonly productionWorkshopCleaningChecklistsService: ProductionWorkshopCleaningChecklistsService,
  ) {}

  @Get()
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.LIST)
  async findAll() {
    return this.productionWorkshopsService.findAll();
  }

  @Get('pressure-differentials/:pressureDifferentialId')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.READ)
  async findPressureDifferentialById(
    @Param('pressureDifferentialId', ParseIntPipe)
    pressureDifferentialId: number,
  ) {
    return this.productionWorkshopPressureDifferentialsService.findById(
      pressureDifferentialId,
    );
  }

  @Put('pressure-differentials/:pressureDifferentialId')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.PRESSURE_DIFFERENTIAL_UPDATE)
  async updatePressureDifferential(
    @Param('pressureDifferentialId', ParseIntPipe)
    pressureDifferentialId: number,
    @Body() updateDto: UpdateProductionWorkshopPressureDifferentialDto,
  ) {
    return this.productionWorkshopPressureDifferentialsService.update(
      pressureDifferentialId,
      updateDto,
    );
  }

  @Delete('pressure-differentials/:pressureDifferentialId')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.PRESSURE_DIFFERENTIAL_DELETE)
  async deletePressureDifferential(
    @Param('pressureDifferentialId', ParseIntPipe)
    pressureDifferentialId: number,
  ) {
    return this.productionWorkshopPressureDifferentialsService.delete(
      pressureDifferentialId,
    );
  }

  @Get('cleaning-checklists/:cleaningChecklistId')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.READ)
  async findCleaningChecklistById(
    @Param('cleaningChecklistId', ParseIntPipe)
    cleaningChecklistId: number,
  ) {
    return this.productionWorkshopCleaningChecklistsService.findById(
      cleaningChecklistId,
    );
  }

  @Put('cleaning-checklists/:cleaningChecklistId')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.UPDATE)
  async updateCleaningChecklist(
    @Param('cleaningChecklistId', ParseIntPipe)
    cleaningChecklistId: number,
    @Body() updateDto: UpdateProductionWorkshopCleaningChecklistDto,
  ) {
    return this.productionWorkshopCleaningChecklistsService.update(
      cleaningChecklistId,
      updateDto,
    );
  }

  @Delete('cleaning-checklists/:cleaningChecklistId')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.DELETE)
  async deleteCleaningChecklist(
    @Param('cleaningChecklistId', ParseIntPipe)
    cleaningChecklistId: number,
  ) {
    return this.productionWorkshopCleaningChecklistsService.delete(
      cleaningChecklistId,
    );
  }

  @Get(':id/pressure-differentials')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.READ)
  async findPressureDifferentials(@Param('id', ParseIntPipe) id: number) {
    return this.productionWorkshopPressureDifferentialsService.findAllByProductionWorkshop(
      id,
    );
  }

  @Post(':id/pressure-differentials')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.PRESSURE_DIFFERENTIAL_CREATE)
  async createPressureDifferential(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionWorkshopPressureDifferentialDto,
    @Request() req: any,
  ) {
    return this.productionWorkshopPressureDifferentialsService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/cleaning-checklists')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.READ)
  async findCleaningChecklists(@Param('id', ParseIntPipe) id: number) {
    return this.productionWorkshopCleaningChecklistsService.findAllByProductionWorkshop(
      id,
    );
  }

  @Post(':id/cleaning-checklists')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.CREATE)
  async createCleaningChecklist(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionWorkshopCleaningChecklistDto,
  ) {
    return this.productionWorkshopCleaningChecklistsService.create(id, createDto);
  }

  @Get(':id')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productionWorkshopsService.findById(id);
  }

  @Post()
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.CREATE)
  async create(@Body() createDto: CreateProductionWorkshopDto) {
    return this.productionWorkshopsService.create(createDto);
  }

  @Put(':id')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductionWorkshopDto,
  ) {
    return this.productionWorkshopsService.update(id, updateDto);
  }

  @Delete(':id')
  @Permissions(PRODUCTION_WORKSHOP_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.productionWorkshopsService.delete(id);
  }
}
