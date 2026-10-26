import { ProductionOrderWeighingRecordsEventsInterceptor } from './production-order-weighing-records-events.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UsePipes,
  ValidationPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { productionOrderWeighingRecordLotCheckImageUploadOptions } from './production-order-weighing-record-lot-check-upload.config';
import { WeighingDetailUploadCleanupInterceptor } from './production-order-weighing-detail-upload-cleanup.interceptor';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';
import { CreateProductionOrderWeighingRecordLineDto } from './dto/create-production-order-weighing-record-line.dto';
import { UpdateProductionOrderWeighingRecordLineDto } from './dto/update-production-order-weighing-record-line.dto';
import { ProductionOrderWeighingRecordLinesService } from './production-order-weighing-record-lines.service';
import { CheckWeighingRecordLotDto } from './dto/check-weighing-record-lot.dto';

@UseInterceptors(ProductionOrderWeighingRecordsEventsInterceptor)
@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-orders/weighing-records/:recordId/lines')
export class ProductionOrderWeighingRecordLinesController {
  constructor(
    private readonly service: ProductionOrderWeighingRecordLinesService,
  ) {}

  @Get()
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  findAll(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.service.findAll(recordId);
  }

  @Get(':lineId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  findById(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
  ) {
    return this.service.findById(recordId, lineId);
  }

  @Post()
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  create(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: CreateProductionOrderWeighingRecordLineDto,
  ) {
    return this.service.create(recordId, dto);
  }

  @Patch(':lineId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  update(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: UpdateProductionOrderWeighingRecordLineDto,
  ) {
    return this.service.update(recordId, lineId, dto);
  }

  @Patch(':lineId/lot-check')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['lot_no', 'is_correct'],
      properties: {
        lot_no: { type: 'string' },
        is_correct: { type: 'boolean' },
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
      ...productionOrderWeighingRecordLotCheckImageUploadOptions,
      limits: {
        ...productionOrderWeighingRecordLotCheckImageUploadOptions.limits,
        files: 20,
      },
    }),
  )
  checkLot(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: CheckWeighingRecordLotDto,
    @Request() req: { user: { id?: number | string | null } },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.checkLot(recordId, lineId, dto, req.user, files ?? []);
  }

  @Delete(':lineId/lot-check/images/:imageId')
  deleteLotCheckImage(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.service.deleteLotCheckImage(recordId, lineId, imageId);
  }

  @Delete(':lineId')
  @Permissions(PRODUCTION_ORDER_PERMISSIONS.DELETE)
  delete(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Param('lineId', ParseIntPipe) lineId: number,
  ) {
    return this.service.delete(recordId, lineId);
  }
}

@UseGuards(jwtAuthGuard)
@Controller('production-orders/weighing-record-lot-checks/images')
export class ProductionOrderWeighingLotCheckImagesController {
  constructor(
    private readonly service: ProductionOrderWeighingRecordLinesService,
  ) {}

  @Get(':filename')
  async image(
    @Param('filename') filename: string,
    @Query('original') original: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const image = await this.service.findLotCheckImage(
      filename,
      original === 'true',
    );
    res.set({
      'Content-Type': image.contentType,
      'Content-Length': String(image.size),
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(createReadStream(image.filePath));
  }
}
