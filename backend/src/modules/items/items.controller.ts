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
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemEquipmentService } from './item-equipment.service';
import { ItemsService } from './items.service';

import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(jwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly itemEquipmentService: ItemEquipmentService,
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

  @Get(':item_code/equipment')
  async findItemEquipment(@Param('item_code') itemCode: string) {
    return this.itemEquipmentService.findAllByItem(itemCode);
  }

  @Post(':item_code/equipment')
  async createItemEquipment(
    @Param('item_code') itemCode: string,
    @Body() createDto: CreateItemEquipmentDto,
    @Request() req: any,
  ) {
    return this.itemEquipmentService.create(itemCode, createDto, req.user);
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
