import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ItemsService } from './items.service';

import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(jwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}
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

  @Get(':item_code')
  async findItemByCode(@Param('item_code') item_code: string) {
    return this.itemsService.findItemByCode(item_code);
  }
}
