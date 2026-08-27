import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { Permissions } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateProductionOrderMixingRecordDto } from './dto/create-production-order-mixing-record.dto';
import { CreateProductionOrderMixingRecordParameterDto } from './dto/create-production-order-mixing-record-parameter.dto';
import { CreateProductionOrderMixingRecordStageDto } from './dto/create-production-order-mixing-record-stage.dto';
import { CreateProductionOrderMixingRecordStepDto } from './dto/create-production-order-mixing-record-step.dto';
import { UpdateProductionOrderMixingRecordParameterDto } from './dto/update-production-order-mixing-record-parameter.dto';
import { UpdateProductionOrderMixingRecordParameterResultDto } from './dto/update-production-order-mixing-record-parameter-result.dto';
import { UpdateProductionOrderMixingRecordDto } from './dto/update-production-order-mixing-record.dto';
import { UpdateProductionOrderMixingRecordStageDto } from './dto/update-production-order-mixing-record-stage.dto';
import { UpdateProductionOrderMixingRecordStepDto } from './dto/update-production-order-mixing-record-step.dto';
import {
  productionOrderMixingRecordParameterImageUploadOptions,
  removeUploadedProductionOrderMixingRecordParameterImage,
} from './production-order-mixing-record-parameter-upload.config';
import { PRODUCTION_ORDER_MIXING_RECORD_PERMISSIONS } from './production-order-mixing-records.permissions';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';
import { ProductionOrderMixingRecordsService } from './production-order-mixing-records.service';

@UseGuards(jwtAuthGuard, PermissionsGuard)
@Controller('production-orders')
export class ProductionOrderMixingRecordsController {
  constructor(
    private readonly productionOrderMixingRecordsService: ProductionOrderMixingRecordsService,
  ) {}

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  @Get('mixing-records/:recordId')
  async findById(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.productionOrderMixingRecordsService.findById(recordId);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('mixing-records/:recordId')
  async update(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: UpdateProductionOrderMixingRecordDto,
  ) {
    return this.productionOrderMixingRecordsService.update(recordId, dto);
  }

  @Delete('mixing-records/:recordId')
  @Permissions(
    PRODUCTION_ORDER_MIXING_RECORD_PERMISSIONS.DELETE,
    PRODUCTION_ORDER_PERMISSIONS.DELETE,
  )
  async delete(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.productionOrderMixingRecordsService.delete(recordId);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('mixing-records/:recordId/qa-staff-approval')
  async approveByQaStaff(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Request() req: any,
  ) {
    return this.productionOrderMixingRecordsService.approveByQaStaff(
      recordId,
      req.user,
    );
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('mixing-records/:recordId/ipc-staff-approval')
  async approveByIpcStaff(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Request() req: any,
  ) {
    return this.productionOrderMixingRecordsService.approveByIpcStaff(
      recordId,
      req.user,
    );
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  @Post('mixing-records/:recordId/stages')
  async createStage(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: CreateProductionOrderMixingRecordStageDto,
  ) {
    return this.productionOrderMixingRecordsService.createStage(recordId, dto);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('mixing-record-stages/:stageId')
  async updateStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: UpdateProductionOrderMixingRecordStageDto,
  ) {
    return this.productionOrderMixingRecordsService.updateStage(stageId, dto);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.DELETE)
  @Delete('mixing-record-stages/:stageId')
  async deleteStage(@Param('stageId', ParseIntPipe) stageId: number) {
    return this.productionOrderMixingRecordsService.deleteStage(stageId);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  @Post('mixing-record-stages/:stageId/steps')
  async createStep(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: CreateProductionOrderMixingRecordStepDto,
  ) {
    return this.productionOrderMixingRecordsService.createStep(stageId, dto);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('mixing-record-steps/:stepId')
  async updateStep(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: UpdateProductionOrderMixingRecordStepDto,
  ) {
    return this.productionOrderMixingRecordsService.updateStep(stepId, dto);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.DELETE)
  @Delete('mixing-record-steps/:stepId')
  async deleteStep(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.productionOrderMixingRecordsService.deleteStep(stepId);
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  @Post('mixing-record-steps/:stepId/parameters')
  async createParameter(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: CreateProductionOrderMixingRecordParameterDto,
  ) {
    return this.productionOrderMixingRecordsService.createParameter(
      stepId,
      dto,
    );
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('mixing-record-parameters/:parameterId')
  async updateParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Body() dto: UpdateProductionOrderMixingRecordParameterDto,
  ) {
    return this.productionOrderMixingRecordsService.updateParameter(
      parameterId,
      dto,
    );
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.DELETE)
  @Delete('mixing-record-parameters/:parameterId')
  async deleteParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
  ) {
    return this.productionOrderMixingRecordsService.deleteParameter(
      parameterId,
    );
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.UPDATE)
  @Patch('mixing-record-parameters/:parameterId/result')
  async updateParameterResult(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Body() dto: UpdateProductionOrderMixingRecordParameterResultDto,
    @Request() req: any,
  ) {
    return this.productionOrderMixingRecordsService.updateParameterResult(
      parameterId,
      dto,
      req.user,
    );
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  @Post('mixing-record-parameters/:parameterId/image')
  @UseInterceptors(
    FileInterceptor(
      'image',
      productionOrderMixingRecordParameterImageUploadOptions,
    ),
  )
  async uploadParameterImage(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (!image) {
      throw new BadRequestException('image is required');
    }

    try {
      return await this.productionOrderMixingRecordsService.uploadParameterImage(
        parameterId,
        image,
      );
    } catch (error) {
      await removeUploadedProductionOrderMixingRecordParameterImage(image);
      throw error;
    }
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  @Get('mixing-record-parameters/images/:filename')
  async getParameterImage(
    @Param('filename') filename: string,
    @Query('original') original: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image =
      await this.productionOrderMixingRecordsService.findParameterImageFile(
        filename,
        original === 'true',
      );
    if (!image) {
      throw new NotFoundException(
        'Production order mixing record parameter image not found',
      );
    }

    response.set({
      'Content-Type': image.contentType,
      'Content-Length': String(image.size),
      'Cache-Control': 'private, max-age=3600',
    });
    return new StreamableFile(createReadStream(image.filePath));
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.READ)
  @Get(':id/mixing-records')
  async findAllByProductionOrder(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderMixingRecordsService.findAllByProductionOrder(
      id,
    );
  }

  @Permissions(PRODUCTION_ORDER_PERMISSIONS.CREATE)
  @Post(':id/mixing-records')
  async create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductionOrderMixingRecordDto,
    @Request() req: any,
  ) {
    return this.productionOrderMixingRecordsService.create(id, dto, req.user);
  }
}
