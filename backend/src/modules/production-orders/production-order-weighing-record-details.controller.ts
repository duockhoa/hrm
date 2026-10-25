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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  create(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: CreateProductionOrderWeighingRecordDetailDto,
    @Request() req: UserRequest,
  ) {
    return this.service.create(recordId, lineId, dto, req.user);
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
