import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { CreateItemFeatureDto } from './dto/create-item-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { UpdateItemFeatureDto } from './dto/update-item-feature.dto';
import { FeaturesService } from './features.service';

@UseGuards(jwtAuthGuard)
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  async findAll() {
    return this.featuresService.findAll();
  }

  @Get('items/:item_code')
  async findByItemCode(
    @Param('item_code') item_code: string,
    @Query('includeDisabled') includeDisabled?: string,
  ) {
    return this.featuresService.findByItemCode(item_code, includeDisabled);
  }

  @Get('items/:item_code/config')
  async findConfigByItemCode(
    @Param('item_code') item_code: string,
    @Query('includeDisabled') includeDisabled?: string,
  ) {
    return this.featuresService.findConfigByItemCode(
      item_code,
      includeDisabled,
    );
  }

  @Get('key/:key')
  async findByKey(@Param('key') key: string) {
    return this.featuresService.findByKey(key);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.featuresService.findById(id);
  }

  @Post()
  async create(@Body() createFeatureDto: CreateFeatureDto) {
    return this.featuresService.create(createFeatureDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFeatureDto: UpdateFeatureDto,
  ) {
    return this.featuresService.update(id, updateFeatureDto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.featuresService.delete(id);
  }

  @Post('items/:item_code')
  async upsertItemFeature(
    @Param('item_code') item_code: string,
    @Body() createItemFeatureDto: CreateItemFeatureDto,
  ) {
    return this.featuresService.upsertItemFeature(
      item_code,
      createItemFeatureDto,
    );
  }

  @Put('items/:item_code/:feature_id')
  async updateItemFeature(
    @Param('item_code') item_code: string,
    @Param('feature_id', ParseIntPipe) feature_id: number,
    @Body() updateItemFeatureDto: UpdateItemFeatureDto,
  ) {
    return this.featuresService.updateItemFeature(
      item_code,
      feature_id,
      updateItemFeatureDto,
    );
  }

  @Delete('items/:item_code/:feature_id')
  async deleteItemFeature(
    @Param('item_code') item_code: string,
    @Param('feature_id', ParseIntPipe) feature_id: number,
  ) {
    return this.featuresService.deleteItemFeature(item_code, feature_id);
  }
}
