import {
  BadRequestException,
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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import type { Response } from 'express';
import { CreateProductionOrderDeviationDto } from './dto/create-production-order-deviation.dto';
import { UpdateProductionOrderDeviationDto } from './dto/update-production-order-deviation.dto';
import {
  getDeviationImagePaths,
  MAX_DEVIATION_IMAGE_COUNT,
  productionOrderDeviationImageUploadOptions,
  removeUploadedDeviationImages,
} from './production-order-deviation-upload.config';
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS } from './production-order-deviations.permissions';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';

type DeviationImageUploadFields = {
  deviation_images?: Express.Multer.File[];
  deviation_image?: Express.Multer.File[];
};

const getUploadedDeviationImages = (
  uploadedFiles?: DeviationImageUploadFields,
) => [
  ...(uploadedFiles?.deviation_images ?? []),
  ...(uploadedFiles?.deviation_image ?? []),
];

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-order-deviations')
export class ProductionOrderDeviationsController {
  constructor(
    private readonly productionOrderDeviationsService: ProductionOrderDeviationsService,
  ) {}

  @Get()
  @Permissions(PRODUCTION_ORDER_DEVIATION_PERMISSIONS.LIST)
  async findAll(@Query('production_order_id') productionOrderId?: string) {
    return this.productionOrderDeviationsService.findAll(productionOrderId);
  }

  @Get('images/:filename')
  @Permissions(PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ)
  async getDeviationImage(
    @Param('filename') filename: string,
    @Query('original') original: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const imageFile =
      await this.productionOrderDeviationsService.findImageFile(
        filename,
        original === 'true',
      );

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
  @Permissions(PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDeviationsService.findById(id);
  }

  @Post()
  @Permissions(PRODUCTION_ORDER_DEVIATION_PERMISSIONS.CREATE)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'deviation_images', maxCount: MAX_DEVIATION_IMAGE_COUNT },
        { name: 'deviation_image', maxCount: MAX_DEVIATION_IMAGE_COUNT },
      ],
      productionOrderDeviationImageUploadOptions,
    ),
  )
  async create(
    @Body()
    createProductionOrderDeviationDto: CreateProductionOrderDeviationDto,
    @UploadedFiles() uploadedFiles?: DeviationImageUploadFields,
  ) {
    const deviationImages = getUploadedDeviationImages(uploadedFiles);

    if (deviationImages.length > MAX_DEVIATION_IMAGE_COUNT) {
      await removeUploadedDeviationImages(deviationImages);
      throw new BadRequestException(
        `deviation_images cannot exceed ${MAX_DEVIATION_IMAGE_COUNT} files`,
      );
    }

    const uploadedImagePaths = getDeviationImagePaths(deviationImages);
    const requestImageInput =
      createProductionOrderDeviationDto.deviation_images !== undefined
        ? createProductionOrderDeviationDto.deviation_images
        : createProductionOrderDeviationDto.deviation_image;

    try {
      return await this.productionOrderDeviationsService.create({
        ...createProductionOrderDeviationDto,
        deviation_images:
          uploadedImagePaths && uploadedImagePaths.length > 0
            ? uploadedImagePaths
            : requestImageInput,
      });
    } catch (error) {
      await removeUploadedDeviationImages(deviationImages);
      throw error;
    }
  }

  @Put(':id')
  @Permissions(PRODUCTION_ORDER_DEVIATION_PERMISSIONS.UPDATE)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'deviation_images', maxCount: MAX_DEVIATION_IMAGE_COUNT },
        { name: 'deviation_image', maxCount: MAX_DEVIATION_IMAGE_COUNT },
      ],
      productionOrderDeviationImageUploadOptions,
    ),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateProductionOrderDeviationDto: UpdateProductionOrderDeviationDto,
    @UploadedFiles() uploadedFiles?: DeviationImageUploadFields,
  ) {
    const deviationImages = getUploadedDeviationImages(uploadedFiles);

    if (deviationImages.length > MAX_DEVIATION_IMAGE_COUNT) {
      await removeUploadedDeviationImages(deviationImages);
      throw new BadRequestException(
        `deviation_images cannot exceed ${MAX_DEVIATION_IMAGE_COUNT} files`,
      );
    }

    const uploadedImagePaths = getDeviationImagePaths(deviationImages);
    const requestImageInput =
      updateProductionOrderDeviationDto.deviation_images !== undefined
        ? updateProductionOrderDeviationDto.deviation_images
        : updateProductionOrderDeviationDto.deviation_image;

    try {
      return await this.productionOrderDeviationsService.update(id, {
        ...updateProductionOrderDeviationDto,
        deviation_images:
          uploadedImagePaths && uploadedImagePaths.length > 0
            ? uploadedImagePaths
            : requestImageInput,
      });
    } catch (error) {
      await removeUploadedDeviationImages(deviationImages);
      throw error;
    }
  }

  @Delete(':id')
  @Permissions(PRODUCTION_ORDER_DEVIATION_PERMISSIONS.DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDeviationsService.delete(id);
  }
}
