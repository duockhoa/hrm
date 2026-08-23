import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreateItemEquipmentDto } from './dto/create-item-equipment.dto';
import { CreateMixingActivityTemplateDto } from './dto/create-mixing-activity-template.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateMixingActivityTemplateDto } from './dto/update-mixing-activity-template.dto';
import { ItemEquipmentService } from './item-equipment.service';
import { MixingActivityTemplatesService } from './mixing-activity-templates.service';
import { ItemsService } from './items.service';

import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(jwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly itemEquipmentService: ItemEquipmentService,
    private readonly mixingActivityTemplatesService: MixingActivityTemplatesService,
  ) {}

  @Get()
  async findAll() {
    return this.itemsService.findAll();
  }

  @Get('finished-products')
  async findFinishedProducts() {
    return this.itemsService.findFinishedProducts();
  }

  @Get('semi-finished-products')
  async findSemiFinishedProducts() {
    return this.itemsService.findSemiFinishedProducts();
  }

  @Get('raw-materials')
  async findRawMaterials() {
    return this.itemsService.findRawMaterials();
  }

  @Get('equipment/:itemEquipmentId')
  async findItemEquipmentById(
    @Param('itemEquipmentId', ParseIntPipe) itemEquipmentId: number,
  ) {
    return this.itemEquipmentService.findById(itemEquipmentId);
  }

  @Delete('equipment/:itemEquipmentId')
  async deleteItemEquipment(
    @Param('itemEquipmentId', ParseIntPipe) itemEquipmentId: number,
  ) {
    return this.itemEquipmentService.delete(itemEquipmentId);
  }

  @Get('mixing-activity-templates/:templateId')
  async findMixingActivityTemplateById(
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.mixingActivityTemplatesService.findById(templateId);
  }

  @Patch('mixing-activity-templates/:templateId')
  async updateMixingActivityTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() updateDto: UpdateMixingActivityTemplateDto,
  ) {
    return this.mixingActivityTemplatesService.update(templateId, updateDto);
  }

  @Delete('mixing-activity-templates/:templateId')
  async deleteMixingActivityTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.mixingActivityTemplatesService.delete(templateId);
  }

  @Get(':item_code/equipment')
  async findItemEquipment(@Param('item_code') itemCode: string) {
    return this.itemEquipmentService.findAllByItem(itemCode);
  }

  @Get(':item_code/mixing-activity-templates')
  async findMixingActivityTemplates(@Param('item_code') itemCode: string) {
    return this.mixingActivityTemplatesService.findAllByItem(itemCode);
  }

  @Post(':item_code/equipment')
  async createItemEquipment(
    @Param('item_code') itemCode: string,
    @Body() createDto: CreateItemEquipmentDto,
    @Request() req: any,
  ) {
    return this.itemEquipmentService.create(itemCode, createDto, req.user);
  }

  @Post(':item_code/mixing-activity-templates')
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
  async findItemByCode(@Param('item_code') item_code: string) {
    return this.itemsService.findItemByCode(item_code);
  }

  @Patch(':item_code')
  async updateItem(
    @Param('item_code') item_code: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsService.update(item_code, updateItemDto);
  }
}
