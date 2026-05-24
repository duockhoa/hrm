import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import type { Response } from 'express';
import { CreateProductionOrderDeviationDto } from './dto/create-production-order-deviation.dto';
import { UpdateProductionOrderDeviationDto } from './dto/update-production-order-deviation.dto';
import {
  getDeviationImagePath,
  productionOrderDeviationImageUploadOptions,
  removeUploadedDeviationImage,
  resolveDeviationImageFile,
} from './production-order-deviation-upload.config';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';

@UseGuards(jwtAuthGuard)
@Controller('production-order-deviations')
export class ProductionOrderDeviationsController {
  constructor(
    private readonly productionOrderDeviationsService: ProductionOrderDeviationsService,
  ) {}

  @Get()
  async findAll(@Query('production_order_id') productionOrderId?: string) {
    return this.productionOrderDeviationsService.findAll(productionOrderId);
  }

  @Get('images/:filename')
  async getDeviationImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const imageFile = await resolveDeviationImageFile(filename);

    if (!imageFile) {
      throw new NotFoundException('Deviation image not found');
    }

    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': imageFile.size,
      'Content-Type': imageFile.contentType,
    });

    return new StreamableFile(createReadStream(imageFile.filePath));
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDeviationsService.findById(id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor(
      'deviation_image',
      productionOrderDeviationImageUploadOptions,
    ),
  )
  async create(
    @Body()
    createProductionOrderDeviationDto: CreateProductionOrderDeviationDto,
    @UploadedFile() deviationImage?: Express.Multer.File,
  ) {
    try {
      return await this.productionOrderDeviationsService.create({
        ...createProductionOrderDeviationDto,
        deviation_image:
          getDeviationImagePath(deviationImage) ??
          createProductionOrderDeviationDto.deviation_image,
      });
    } catch (error) {
      await removeUploadedDeviationImage(deviationImage);
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(
    FileInterceptor(
      'deviation_image',
      productionOrderDeviationImageUploadOptions,
    ),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateProductionOrderDeviationDto: UpdateProductionOrderDeviationDto,
    @UploadedFile() deviationImage?: Express.Multer.File,
  ) {
    try {
      return await this.productionOrderDeviationsService.update(id, {
        ...updateProductionOrderDeviationDto,
        deviation_image:
          getDeviationImagePath(deviationImage) ??
          updateProductionOrderDeviationDto.deviation_image,
      });
    } catch (error) {
      await removeUploadedDeviationImage(deviationImage);
      throw error;
    }
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDeviationsService.delete(id);
  }
}
