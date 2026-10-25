import { ProductionOrderWeighingRecordsEventsInterceptor } from './production-order-weighing-records-events.interceptor';
import { WeighingDetailUploadCleanupInterceptor } from './production-order-weighing-detail-upload-cleanup.interceptor';
import {
  BadRequestException,
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
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FilesInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';
import { CreateProductionOrderWeighingRecordDetailDto } from './dto/create-production-order-weighing-record-detail.dto';
import { UpdateProductionOrderWeighingRecordDetailDto } from './dto/update-production-order-weighing-record-detail.dto';
import { ProductionOrderWeighingRecordDetailsService } from './production-order-weighing-record-details.service';
import { productionOrderWeighingRecordDetailImageUploadOptions } from './production-order-weighing-record-detail-upload.config';

type UserRequest = { user: { id?: number | string | null } };

@UseInterceptors(ProductionOrderWeighingRecordsEventsInterceptor)
@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller(
  'production-orders/weighing-records/:recordId/lines/:lineId/details',
)
export class ProductionOrderWeighingRecordDetailsController {
  constructor(
    private readonly service: ProductionOrderWeighingRecordDetailsService,
  ) {}

  @Get()
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  findAll(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
  ) {
    return this.service.findAll(recordId, lineId);
  }

  @Get(':detailId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  findById(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Param('detailId', ParseIntPipe) id: number,
  ) {
    return this.service.findById(recordId, lineId, id);
  }

  @Post()
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['net_weight'],
      properties: {
        net_weight: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        note: { type: 'string', nullable: true },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 20,
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Legacy single-image field',
        },
      },
    },
  })
  @UseInterceptors(
    new WeighingDetailUploadCleanupInterceptor(),
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'images', maxCount: 20 },
      ],
      {
        ...productionOrderWeighingRecordDetailImageUploadOptions,
        limits: {
          ...productionOrderWeighingRecordDetailImageUploadOptions.limits,
          files: 20,
        },
      },
    ),
  )
  create(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: CreateProductionOrderWeighingRecordDetailDto,
    @Request() req: UserRequest,
    @UploadedFiles()
    files?: { image?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const uploaded = [...(files?.image ?? []), ...(files?.images ?? [])];
    return uploaded.length
      ? this.service.create(
          recordId,
          lineId,
          dto,
          req.user,
          uploaded.length === 1 && files?.image?.length
            ? uploaded[0]
            : uploaded,
        )
      : this.service.create(recordId, lineId, dto, req.user);
  }

  @Patch(':detailId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  update(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Param('detailId', ParseIntPipe) id: number,
    @Body() dto: UpdateProductionOrderWeighingRecordDetailDto,
    @Request() req: UserRequest,
  ) {
    return this.service.update(recordId, lineId, id, dto, req.user);
  }

  @Delete(':detailId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.DELETE)
  delete(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Param('detailId', ParseIntPipe) id: number,
  ) {
    return this.service.delete(recordId, lineId, id);
  }

  @Post(':detailId/images')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 20,
        },
      },
    },
  })
  @UseInterceptors(
    new WeighingDetailUploadCleanupInterceptor(),
    FilesInterceptor('images', 20, {
      ...productionOrderWeighingRecordDetailImageUploadOptions,
      limits: {
        ...productionOrderWeighingRecordDetailImageUploadOptions.limits,
        files: 20,
      },
    }),
  )
  uploadImages(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Param('detailId', ParseIntPipe) id: number,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.uploadImages(recordId, lineId, id, files ?? []);
  }

  @Delete(':detailId/images/:imageId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  deleteImageById(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Param('detailId', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.service.deleteImageById(recordId, lineId, id, imageId);
  }

  @Post(':detailId/image')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    new WeighingDetailUploadCleanupInterceptor(),
    FileInterceptor(
      'image',
      productionOrderWeighingRecordDetailImageUploadOptions,
    ),
  )
  async uploadImage(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Param('detailId', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('image is required');
    return this.service.uploadImage(recordId, lineId, id, file);
  }

  @Delete(':detailId/image')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  deleteImage(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Param('detailId', ParseIntPipe) id: number,
  ) {
    return this.service.deleteImage(recordId, lineId, id);
  }
}

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-orders/weighing-record-details/images')
export class ProductionOrderWeighingDetailImagesController {
  constructor(
    private readonly service: ProductionOrderWeighingRecordDetailsService,
  ) {}

  @Get(':filename')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  async image(
    @Param('filename') filename: string,
    @Query('original') original: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const image = await this.service.findImage(filename, original === 'true');
    res.set({
      'Content-Type': image.contentType,
      'Content-Length': String(image.size),
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(createReadStream(image.filePath));
  }
}
