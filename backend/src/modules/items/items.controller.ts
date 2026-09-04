import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateItemEquipmentDto } from './dto/create-item-equipment.dto';
import { CopyItemEquipmentDto } from './dto/copy-item-equipment.dto';
import { CreateMixingActivityTemplateDto } from './dto/create-mixing-activity-template.dto';
import { CreateMixingActivityTemplateStageDto } from './dto/create-mixing-activity-template-stage.dto';
import { CreateMixingActivityTemplateStageStepDto } from './dto/create-mixing-activity-template-stage-step.dto';
import { CreateMixingActivityTemplateStageStepParameterDto } from './dto/create-mixing-activity-template-stage-step-parameter.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateMixingActivityTemplateDto } from './dto/update-mixing-activity-template.dto';
import { UpdateMixingActivityTemplateStageDto } from './dto/update-mixing-activity-template-stage.dto';
import { UpdateMixingActivityTemplateStageStepDto } from './dto/update-mixing-activity-template-stage-step.dto';
import { UpdateMixingActivityTemplateStageStepParameterDto } from './dto/update-mixing-activity-template-stage-step-parameter.dto';
import { ItemEquipmentService } from './item-equipment.service';
import { MIXING_ACTIVITY_TEMPLATE_PERMISSIONS } from './mixing-activity-templates.permissions';
import { MixingActivityTemplatesService } from './mixing-activity-templates.service';
import { MixingActivityTemplateStagesService } from './mixing-activity-template-stages.service';
import { MixingActivityTemplateStageStepsService } from './mixing-activity-template-stage-steps.service';
import { MixingActivityTemplateStageStepParametersService } from './mixing-activity-template-stage-step-parameters.service';
import { ItemsService } from './items.service';
import { ITEM_PERMISSIONS } from './items.permissions';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly itemEquipmentService: ItemEquipmentService,
    private readonly mixingActivityTemplatesService: MixingActivityTemplatesService,
    private readonly mixingActivityTemplateStagesService: MixingActivityTemplateStagesService,
    private readonly mixingActivityTemplateStageStepsService: MixingActivityTemplateStageStepsService,
    private readonly mixingActivityTemplateStageStepParametersService: MixingActivityTemplateStageStepParametersService,
  ) {}

  @Get()
  @Permissions(ITEM_PERMISSIONS.LIST)
  async findAll(@Query('codePrefix') codePrefix?: string) {
    return this.itemsService.findAll(codePrefix);
  }

  @Get('finished-products')
  @Permissions(ITEM_PERMISSIONS.LIST)
  async findFinishedProducts() {
    return this.itemsService.findFinishedProducts();
  }

  @Get('semi-finished-products')
  @Permissions(ITEM_PERMISSIONS.LIST)
  async findSemiFinishedProducts() {
    return this.itemsService.findSemiFinishedProducts();
  }

  @Get('raw-materials')
  @Permissions(ITEM_PERMISSIONS.LIST)
  async findRawMaterials() {
    return this.itemsService.findRawMaterials();
  }

  @Get('equipment/:itemEquipmentId')
  @Permissions(ITEM_PERMISSIONS.READ)
  async findItemEquipmentById(
    @Param('itemEquipmentId', ParseIntPipe) itemEquipmentId: number,
  ) {
    return this.itemEquipmentService.findById(itemEquipmentId);
  }

  @Delete('equipment/:itemEquipmentId')
  @Permissions(ITEM_PERMISSIONS.DELETE)
  async deleteItemEquipment(
    @Param('itemEquipmentId', ParseIntPipe) itemEquipmentId: number,
  ) {
    return this.itemEquipmentService.delete(itemEquipmentId);
  }

  @Get('mixing-activity-templates')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findAllMixingActivityTemplates() {
    return this.mixingActivityTemplatesService.findAll();
  }

  @Get('mixing-activity-templates/:templateId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findMixingActivityTemplateById(
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.mixingActivityTemplatesService.findById(templateId);
  }

  @Patch('mixing-activity-templates/:templateId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.UPDATE)
  async updateMixingActivityTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() updateDto: UpdateMixingActivityTemplateDto,
  ) {
    return this.mixingActivityTemplatesService.update(templateId, updateDto);
  }

  @Delete('mixing-activity-templates/:templateId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.DELETE)
  async deleteMixingActivityTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.mixingActivityTemplatesService.delete(templateId);
  }

  @Get('mixing-activity-template-stages/:stageId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findMixingActivityTemplateStageById(
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.mixingActivityTemplateStagesService.findById(stageId);
  }

  @Patch('mixing-activity-template-stages/:stageId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.UPDATE)
  async updateMixingActivityTemplateStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() updateDto: UpdateMixingActivityTemplateStageDto,
  ) {
    return this.mixingActivityTemplateStagesService.update(stageId, updateDto);
  }

  @Delete('mixing-activity-template-stages/:stageId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.DELETE)
  async deleteMixingActivityTemplateStage(
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.mixingActivityTemplateStagesService.delete(stageId);
  }

  @Get('mixing-activity-template-stage-steps/:stepId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findMixingActivityTemplateStageStepById(
    @Param('stepId', ParseIntPipe) stepId: number,
  ) {
    return this.mixingActivityTemplateStageStepsService.findById(stepId);
  }

  @Patch('mixing-activity-template-stage-steps/:stepId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.UPDATE)
  async updateMixingActivityTemplateStageStep(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() updateDto: UpdateMixingActivityTemplateStageStepDto,
  ) {
    return this.mixingActivityTemplateStageStepsService.update(
      stepId,
      updateDto,
    );
  }

  @Delete('mixing-activity-template-stage-steps/:stepId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.DELETE)
  async deleteMixingActivityTemplateStageStep(
    @Param('stepId', ParseIntPipe) stepId: number,
  ) {
    return this.mixingActivityTemplateStageStepsService.delete(stepId);
  }

  @Get('mixing-activity-template-stage-step-parameters/:parameterId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findMixingActivityTemplateStageStepParameterById(
    @Param('parameterId', ParseIntPipe) parameterId: number,
  ) {
    return this.mixingActivityTemplateStageStepParametersService.findById(
      parameterId,
    );
  }

  @Patch('mixing-activity-template-stage-step-parameters/:parameterId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.UPDATE)
  async updateMixingActivityTemplateStageStepParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Body() updateDto: UpdateMixingActivityTemplateStageStepParameterDto,
  ) {
    return this.mixingActivityTemplateStageStepParametersService.update(
      parameterId,
      updateDto,
    );
  }

  @Delete('mixing-activity-template-stage-step-parameters/:parameterId')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.DELETE)
  async deleteMixingActivityTemplateStageStepParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
  ) {
    return this.mixingActivityTemplateStageStepParametersService.delete(
      parameterId,
    );
  }

  @Get('mixing-activity-templates/:templateId/stages')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findMixingActivityTemplateStages(
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.mixingActivityTemplateStagesService.findAllByTemplate(
      templateId,
    );
  }

  @Post('mixing-activity-templates/:templateId/stages')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.CREATE)
  async createMixingActivityTemplateStage(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() createDto: CreateMixingActivityTemplateStageDto,
    @Request() req: any,
  ) {
    return this.mixingActivityTemplateStagesService.create(
      templateId,
      createDto,
      req.user,
    );
  }

  @Get('mixing-activity-template-stages/:stageId/steps')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findMixingActivityTemplateStageSteps(
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.mixingActivityTemplateStageStepsService.findAllByStage(stageId);
  }

  @Post('mixing-activity-template-stages/:stageId/steps')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.CREATE)
  async createMixingActivityTemplateStageStep(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() createDto: CreateMixingActivityTemplateStageStepDto,
    @Request() req: any,
  ) {
    return this.mixingActivityTemplateStageStepsService.create(
      stageId,
      createDto,
      req.user,
    );
  }

  @Get('mixing-activity-template-stage-steps/:stepId/parameters')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findMixingActivityTemplateStageStepParameters(
    @Param('stepId', ParseIntPipe) stepId: number,
  ) {
    return this.mixingActivityTemplateStageStepParametersService.findAllByStep(
      stepId,
    );
  }

  @Post('mixing-activity-template-stage-steps/:stepId/parameters')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.CREATE)
  async createMixingActivityTemplateStageStepParameter(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() createDto: CreateMixingActivityTemplateStageStepParameterDto,
    @Request() req: any,
  ) {
    return this.mixingActivityTemplateStageStepParametersService.create(
      stepId,
      createDto,
      req.user,
    );
  }

  @Get(':item_code/equipment')
  @Permissions(ITEM_PERMISSIONS.READ)
  async findItemEquipment(@Param('item_code') itemCode: string) {
    return this.itemEquipmentService.findAllByItem(itemCode);
  }

  @Get(':item_code/mixing-activity-templates')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ)
  async findMixingActivityTemplates(@Param('item_code') itemCode: string) {
    return this.mixingActivityTemplatesService.findAllByItem(itemCode);
  }

  @Post(':item_code/equipment')
  @Permissions(ITEM_PERMISSIONS.CREATE)
  async createItemEquipment(
    @Param('item_code') itemCode: string,
    @Body() createDto: CreateItemEquipmentDto,
    @Request() req: any,
  ) {
    return this.itemEquipmentService.create(itemCode, createDto, req.user);
  }

  @Post(':item_code/equipment/copy')
  @Permissions(ITEM_PERMISSIONS.UPDATE)
  async copyItemEquipment(
    @Param('item_code') itemCode: string,
    @Body() copyDto: CopyItemEquipmentDto,
    @Request() req: any,
  ) {
    return this.itemEquipmentService.copyFromItem(
      itemCode,
      copyDto,
      req.user,
    );
  }

  @Post(':item_code/mixing-activity-templates')
  @Permissions(MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.CREATE)
  async createMixingActivityTemplate(
    @Param('item_code') itemCode: string,
    @Body() createDto: CreateMixingActivityTemplateDto,
    @Request() req: any,
  ) {
    return this.mixingActivityTemplatesService.create(
      itemCode,
      createDto,
      req.user,
    );
  }

  @Get(':item_code')
  @Permissions(ITEM_PERMISSIONS.READ)
  async findItemByCode(@Param('item_code') item_code: string) {
    return this.itemsService.findItemByCode(item_code);
  }

  @Patch(':item_code')
  @Permissions(ITEM_PERMISSIONS.UPDATE)
  async updateItem(
    @Param('item_code') item_code: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsService.update(item_code, updateItemDto);
  }
}
