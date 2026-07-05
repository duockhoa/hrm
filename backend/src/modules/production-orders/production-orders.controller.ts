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
  Request,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { ProductionOrdersService } from './production-orders.service';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import type { ExportProductionOrderLinesDto } from './dto/export-production-order-lines.dto';
import { CreateProductionOrderSamplingRequestDto } from './dto/create-production-order-sampling-request.dto';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';
import { CreateProductionOrderSamplingRecordDto } from './dto/create-production-order-sampling-record.dto';
import { UpdateProductionOrderSamplingRecordDto } from './dto/update-production-order-sampling-record.dto';
import { ProductionOrderSamplingRecordsService } from './production-order-sampling-records.service';
import { CreateProductionOrderEnvironmentCheckDto } from './dto/create-production-order-environment-check.dto';
import { ProductionOrderEnvironmentChecksService } from './production-order-environment-checks.service';
import { CreateProductionOrderFinishedProductSummaryDto } from './dto/create-production-order-finished-product-summary.dto';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { CreateProductionOrderDensityCheckDto } from './dto/create-production-order-density-check.dto';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';
import { CreateProductionOrderFriabilityCheckDto } from './dto/create-production-order-friability-check.dto';
import { ProductionOrderFriabilityChecksService } from './production-order-friability-checks.service';
import { CreateProductionOrderSprayDoseCheckDto } from './dto/create-production-order-spray-dose-check.dto';
import { ProductionOrderSprayDoseChecksService } from './production-order-spray-dose-checks.service';
import { CreateProductionOrderPostHomogenizationGranuleCheckDto } from './dto/create-production-order-post-homogenization-granule-check.dto';
import { ProductionOrderPostHomogenizationGranuleChecksService } from './production-order-post-homogenization-granule-checks.service';
import { CreateProductionOrderDisintegrationCheckDto } from './dto/create-production-order-disintegration-check.dto';
import { ProductionOrderDisintegrationChecksService } from './production-order-disintegration-checks.service';
import { CreateProductionOrderHardCapsuleLeakageCheckDto } from './dto/create-production-order-hard-capsule-leakage-check.dto';
import { ProductionOrderHardCapsuleLeakageChecksService } from './production-order-hard-capsule-leakage-checks.service';
import { CreateProductionOrderBottleVolumeCheckDto } from './dto/create-production-order-bottle-volume-check.dto';
import { ProductionOrderBottleVolumeChecksService } from './production-order-bottle-volume-checks.service';
import { CreateProductionOrderShellWeightCheckDto } from './dto/create-production-order-shell-weight-check.dto';
import { ProductionOrderShellWeightChecksService } from './production-order-shell-weight-checks.service';
import { CreateProductionOrderTenShellWeightCheckDto } from './dto/create-production-order-ten-shell-weight-check.dto';
import { ProductionOrderTenShellWeightChecksService } from './production-order-ten-shell-weight-checks.service';
import { CreateProductionOrderVialInspectionCheckDto } from './dto/create-production-order-vial-inspection-check.dto';
import { ProductionOrderVialInspectionChecksService } from './production-order-vial-inspection-checks.service';
import { CreateProductionOrderCylinderCalibrationDto } from './dto/create-production-order-cylinder-calibration.dto';
import { ProductionOrderCylinderCalibrationsService } from './production-order-cylinder-calibrations.service';
import { CreateProductionOrderSensoryCheckDto } from './dto/create-production-order-sensory-check.dto';
import { ProductionOrderSensoryChecksService } from './production-order-sensory-checks.service';
import { CreateProductionOrderDateCheckDto } from './dto/create-production-order-date-check.dto';
import { UpdateProductionOrderDateCheckDto } from './dto/update-production-order-date-check.dto';
import { ApproveProductionOrderDateCheckDto } from './dto/approve-production-order-date-check.dto';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';
import {
  getDateCheckImagePaths,
  getDateCheckRequestFilePath,
  MAX_DATE_CHECK_IMAGE_COUNT,
  productionOrderDateCheckUploadOptions,
  removeUploadedDateCheckFiles,
} from './production-order-date-check-upload.config';
import {
  getSensoryCheckImagePath,
  productionOrderSensoryCheckImageUploadOptions,
  removeUploadedSensoryCheckImage,
} from './production-order-sensory-check-upload.config';
import {
  getPostHomogenizationGranuleCheckImagePath,
  productionOrderPostHomogenizationGranuleCheckImageUploadOptions,
  removeUploadedPostHomogenizationGranuleCheckImage,
} from './production-order-post-homogenization-granule-check-upload.config';

type DateCheckUploadFields = {
  request_file?: Express.Multer.File[];
  images?: Express.Multer.File[];
  image?: Express.Multer.File[];
};

type SensoryCheckUploadFields = {
  sensory_image?: Express.Multer.File[];
  image?: Express.Multer.File[];
};

type PostHomogenizationGranuleCheckUploadFields = {
  granule_image?: Express.Multer.File[];
  image?: Express.Multer.File[];
};

const dateCheckRequestFileUploadFields = [
  { name: 'request_file', maxCount: 1 },
];

const dateCheckImageUploadFields = [
  { name: 'images', maxCount: MAX_DATE_CHECK_IMAGE_COUNT },
  { name: 'image', maxCount: MAX_DATE_CHECK_IMAGE_COUNT },
];

const getUploadedDateCheckImages = (uploadedFiles?: DateCheckUploadFields) => [
  ...(uploadedFiles?.images ?? []),
  ...(uploadedFiles?.image ?? []),
];

const getUploadedDateCheckFiles = (uploadedFiles?: DateCheckUploadFields) => [
  ...(uploadedFiles?.request_file ?? []),
  ...getUploadedDateCheckImages(uploadedFiles),
];

const getUploadedSensoryCheckImages = (
  uploadedFiles?: SensoryCheckUploadFields,
) => [...(uploadedFiles?.sensory_image ?? []), ...(uploadedFiles?.image ?? [])];

const getUploadedPostHomogenizationGranuleCheckImages = (
  uploadedFiles?: PostHomogenizationGranuleCheckUploadFields,
) => [...(uploadedFiles?.granule_image ?? []), ...(uploadedFiles?.image ?? [])];

const getAsciiFilenameFallback = (filename: string) => {
  const fallback = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return fallback || 'download.xlsx';
};

const encodeContentDispositionFilename = (filename: string) =>
  encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

@UseGuards(jwtAuthGuard)
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
    private readonly productionOrderSamplingRequestsService: ProductionOrderSamplingRequestsService,
    private readonly productionOrderSamplingRecordsService: ProductionOrderSamplingRecordsService,
    private readonly productionOrderEnvironmentChecksService: ProductionOrderEnvironmentChecksService,
    private readonly productionOrderFinishedProductSummariesService: ProductionOrderFinishedProductSummariesService,
    private readonly productionOrderDensityChecksService: ProductionOrderDensityChecksService,
    private readonly productionOrderFriabilityChecksService: ProductionOrderFriabilityChecksService,
    private readonly productionOrderSprayDoseChecksService: ProductionOrderSprayDoseChecksService,
    private readonly productionOrderPostHomogenizationGranuleChecksService: ProductionOrderPostHomogenizationGranuleChecksService,
    private readonly productionOrderDisintegrationChecksService: ProductionOrderDisintegrationChecksService,
    private readonly productionOrderHardCapsuleLeakageChecksService: ProductionOrderHardCapsuleLeakageChecksService,
    private readonly productionOrderBottleVolumeChecksService: ProductionOrderBottleVolumeChecksService,
    private readonly productionOrderShellWeightChecksService: ProductionOrderShellWeightChecksService,
    private readonly productionOrderTenShellWeightChecksService: ProductionOrderTenShellWeightChecksService,
    private readonly productionOrderVialInspectionChecksService: ProductionOrderVialInspectionChecksService,
    private readonly productionOrderCylinderCalibrationsService: ProductionOrderCylinderCalibrationsService,
    private readonly productionOrderSensoryChecksService: ProductionOrderSensoryChecksService,
    private readonly productionOrderDateChecksService: ProductionOrderDateChecksService,
  ) {}

  @Get()
  async findAll() {
    return this.productionOrdersService.findAll();
  }

  @Get('finished-products')
  async findFinishedProducts() {
    return this.productionOrdersService.findFinishedProducts();
  }

  @Get('semi-finished-products')
  async findSemiFinishedProducts() {
    return this.productionOrdersService.findSemiFinishedProducts();
  }

  @Get('finished-product-summaries/:summaryId')
  async findFinishedProductSummaryById(
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.productionOrderFinishedProductSummariesService.findById(
      summaryId,
    );
  }

  @Get('environment-checks/:checkId')
  async findEnvironmentCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderEnvironmentChecksService.findById(checkId);
  }

  @Get('density-checks/:checkId')
  async findDensityCheckById(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderDensityChecksService.findById(checkId);
  }

  @Get('sampling-records/:recordId')
  async findSamplingRecordById(
    @Param('recordId', ParseIntPipe) recordId: number,
  ) {
    return this.productionOrderSamplingRecordsService.findById(recordId);
  }

  @Patch('sampling-records/:recordId')
  async updateSamplingRecord(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() updateDto: UpdateProductionOrderSamplingRecordDto,
  ) {
    return this.productionOrderSamplingRecordsService.update(
      recordId,
      updateDto,
    );
  }

  @Delete('sampling-records/:recordId')
  async deleteSamplingRecord(
    @Param('recordId', ParseIntPipe) recordId: number,
  ) {
    return this.productionOrderSamplingRecordsService.delete(recordId);
  }

  @Get('friability-checks/:checkId')
  async findFriabilityCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderFriabilityChecksService.findById(checkId);
  }

  @Get('spray-dose-checks/:checkId')
  async findSprayDoseCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSprayDoseChecksService.findById(checkId);
  }

  @Get('post-homogenization-granule-checks/:checkId')
  async findPostHomogenizationGranuleCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderPostHomogenizationGranuleChecksService.findById(
      checkId,
    );
  }

  @Get('disintegration-checks/:checkId')
  async findDisintegrationCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderDisintegrationChecksService.findById(checkId);
  }

  @Get('hard-capsule-leakage-checks/:checkId')
  async findHardCapsuleLeakageCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderHardCapsuleLeakageChecksService.findById(
      checkId,
    );
  }

  @Get('bottle-volume-checks/:checkId')
  async findBottleVolumeCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderBottleVolumeChecksService.findById(checkId);
  }

  @Get('shell-weight-checks/:checkId')
  async findShellWeightCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderShellWeightChecksService.findById(checkId);
  }

  @Get('ten-shell-weight-checks/:checkId')
  async findTenShellWeightCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderTenShellWeightChecksService.findById(checkId);
  }

  @Get('vial-inspection-checks/:checkId')
  async findVialInspectionCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderVialInspectionChecksService.findById(checkId);
  }

  @Get('date-checks/images/:filename')
  async getDateCheckImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const imageFile =
      await this.productionOrderDateChecksService.findImageFile(filename);

    if (!imageFile) {
      throw new NotFoundException('Date check image not found');
    }

    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': imageFile.size,
      'Content-Type': imageFile.contentType,
    });

    return new StreamableFile(createReadStream(imageFile.filePath));
  }

  @Get('date-checks/request-files/:filename')
  async getDateCheckRequestFile(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const requestFile =
      await this.productionOrderDateChecksService.findRequestFile(filename);

    if (!requestFile) {
      throw new NotFoundException('Date check request file not found');
    }

    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': requestFile.size,
      'Content-Type': requestFile.contentType,
    });

    return new StreamableFile(createReadStream(requestFile.filePath));
  }

  @Get('sensory-checks/images/:filename')
  async getSensoryCheckImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const imageFile =
      await this.productionOrderSensoryChecksService.findImageFile(filename);

    if (!imageFile) {
      throw new NotFoundException('Sensory check image not found');
    }

    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': imageFile.size,
      'Content-Type': imageFile.contentType,
    });

    return new StreamableFile(createReadStream(imageFile.filePath));
  }

  @Get('post-homogenization-granule-checks/images/:filename')
  async getPostHomogenizationGranuleCheckImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const imageFile =
      await this.productionOrderPostHomogenizationGranuleChecksService.findImageFile(
        filename,
      );

    if (!imageFile) {
      throw new NotFoundException(
        'Post-homogenization granule check image not found',
      );
    }

    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': imageFile.size,
      'Content-Type': imageFile.contentType,
    });

    return new StreamableFile(createReadStream(imageFile.filePath));
  }

  @Get('sensory-checks/:checkId')
  async findSensoryCheckById(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderSensoryChecksService.findById(checkId);
  }

  @Get('date-checks/:checkId')
  async findDateCheckById(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderDateChecksService.findById(checkId);
  }

  @Patch('date-checks/:checkId')
  @UseInterceptors(
    FileFieldsInterceptor(
      dateCheckRequestFileUploadFields,
      productionOrderDateCheckUploadOptions,
    ),
  )
  async updateDateCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderDateCheckDto,
    @UploadedFiles() uploadedFiles?: DateCheckUploadFields,
  ) {
    const uploadedRequestFile = uploadedFiles?.request_file?.[0];

    try {
      return await this.productionOrderDateChecksService.update(
        checkId,
        updateDto,
        {
          requestFilePath: getDateCheckRequestFilePath(uploadedRequestFile),
        },
      );
    } catch (error) {
      await removeUploadedDateCheckFiles(
        getUploadedDateCheckFiles(uploadedFiles),
      );
      throw error;
    }
  }

  @Patch('date-checks/:checkId/approval')
  async approveDateCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() approveDto: ApproveProductionOrderDateCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderDateChecksService.approve(
      checkId,
      approveDto,
      req.user,
    );
  }

  @Delete('date-checks/:checkId')
  async deleteDateCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderDateChecksService.delete(checkId);
  }

  @Post('date-checks/:checkId/images')
  @UseInterceptors(
    FileFieldsInterceptor(
      dateCheckImageUploadFields,
      productionOrderDateCheckUploadOptions,
    ),
  )
  async addDateCheckImages(
    @Param('checkId', ParseIntPipe) checkId: number,
    @UploadedFiles() uploadedFiles: DateCheckUploadFields | undefined,
    @Request() req: any,
  ) {
    const uploadedImages = getUploadedDateCheckImages(uploadedFiles);

    if (uploadedImages.length > MAX_DATE_CHECK_IMAGE_COUNT) {
      await removeUploadedDateCheckFiles(uploadedImages);
      throw new BadRequestException(
        `images cannot exceed ${MAX_DATE_CHECK_IMAGE_COUNT} files`,
      );
    }

    try {
      return await this.productionOrderDateChecksService.addImages(
        checkId,
        getDateCheckImagePaths(uploadedImages),
        req.user,
      );
    } catch (error) {
      await removeUploadedDateCheckFiles(uploadedImages);
      throw error;
    }
  }

  @Delete('date-checks/images/:imageId')
  async deleteDateCheckImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.productionOrderDateChecksService.deleteImage(imageId);
  }

  @Get(':id/export')
  async exportProductionOrder(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exportedFile =
      await this.productionOrdersService.exportProductionOrder(id);
    const filenameFallback = getAsciiFilenameFallback(exportedFile.filename);
    const encodedFilename = encodeContentDispositionFilename(
      exportedFile.filename,
    );

    response.set({
      'Content-Disposition': `attachment; filename="${filenameFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': exportedFile.buffer.length,
      'Content-Type': exportedFile.contentType,
    });

    return new StreamableFile(exportedFile.buffer);
  }

  @Get(':id')
  async findProductionOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrdersService.findProductionOrderById(id);
  }
  @Get(':id/production-order-lines')
  async findProductionOrderLines(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrdersService.findProductionOrderLines(id);
  }

  @Get(':id/sampling-requests')
  async findSamplingRequests(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderSamplingRequestsService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/sampling-requests')
  async createSamplingRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSamplingRequestDto,
    @Request() req: any,
  ) {
    return this.productionOrderSamplingRequestsService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/sampling-records')
  async findSamplingRecords(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderSamplingRecordsService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/sampling-records')
  async createSamplingRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSamplingRecordDto,
    @Request() req: any,
  ) {
    return this.productionOrderSamplingRecordsService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/environment-checks')
  async findEnvironmentChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderEnvironmentChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/environment-checks')
  async createEnvironmentCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderEnvironmentCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderEnvironmentChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/density-checks')
  async findDensityChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDensityChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/density-checks')
  async createDensityCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderDensityCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderDensityChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/friability-checks')
  async findFriabilityChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderFriabilityChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/friability-checks')
  async createFriabilityCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderFriabilityCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderFriabilityChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/spray-dose-checks')
  async findSprayDoseChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderSprayDoseChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/spray-dose-checks')
  async createSprayDoseCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSprayDoseCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderSprayDoseChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/post-homogenization-granule-checks')
  async findPostHomogenizationGranuleChecks(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productionOrderPostHomogenizationGranuleChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/post-homogenization-granule-checks')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'granule_image', maxCount: 1 },
        { name: 'image', maxCount: 1 },
      ],
      productionOrderPostHomogenizationGranuleCheckImageUploadOptions,
    ),
  )
  async createPostHomogenizationGranuleCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderPostHomogenizationGranuleCheckDto,
    @UploadedFiles()
    uploadedFiles: PostHomogenizationGranuleCheckUploadFields | undefined,
    @Request() req: any,
  ) {
    const uploadedImages =
      getUploadedPostHomogenizationGranuleCheckImages(uploadedFiles);

    if (uploadedImages.length > 1) {
      await Promise.all(
        uploadedImages.map(removeUploadedPostHomogenizationGranuleCheckImage),
      );
      throw new BadRequestException(
        'Only one post-homogenization granule check image is allowed',
      );
    }

    try {
      return await this.productionOrderPostHomogenizationGranuleChecksService.create(
        id,
        createDto,
        req.user,
        {
          imagePath: getPostHomogenizationGranuleCheckImagePath(
            uploadedImages[0],
          ),
        },
      );
    } catch (error) {
      await Promise.all(
        uploadedImages.map(removeUploadedPostHomogenizationGranuleCheckImage),
      );
      throw error;
    }
  }

  @Get(':id/disintegration-checks')
  async findDisintegrationChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDisintegrationChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/disintegration-checks')
  async createDisintegrationCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderDisintegrationCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderDisintegrationChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/hard-capsule-leakage-checks')
  async findHardCapsuleLeakageChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderHardCapsuleLeakageChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/hard-capsule-leakage-checks')
  async createHardCapsuleLeakageCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderHardCapsuleLeakageCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderHardCapsuleLeakageChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/bottle-volume-checks')
  async findBottleVolumeChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderBottleVolumeChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/bottle-volume-checks')
  async createBottleVolumeCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderBottleVolumeCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderBottleVolumeChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/shell-weight-checks')
  async findShellWeightChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderShellWeightChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/shell-weight-checks')
  async createShellWeightCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderShellWeightCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderShellWeightChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/ten-shell-weight-check')
  async findTenShellWeightCheck(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderTenShellWeightChecksService.findByProductionOrder(
      id,
    );
  }

  @Post(':id/ten-shell-weight-check')
  async upsertTenShellWeightCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderTenShellWeightCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderTenShellWeightChecksService.upsert(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/vial-inspection-checks')
  async findVialInspectionChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderVialInspectionChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/vial-inspection-checks')
  async createVialInspectionCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderVialInspectionCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderVialInspectionChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/cylinder-calibration')
  async findCylinderCalibration(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderCylinderCalibrationsService.findByProductionOrder(
      id,
    );
  }

  @Post(':id/cylinder-calibration')
  async upsertCylinderCalibration(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderCylinderCalibrationDto,
    @Request() req: any,
  ) {
    return this.productionOrderCylinderCalibrationsService.upsert(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/sensory-checks')
  async findSensoryChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderSensoryChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/sensory-checks')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'sensory_image', maxCount: 1 },
        { name: 'image', maxCount: 1 },
      ],
      productionOrderSensoryCheckImageUploadOptions,
    ),
  )
  async createSensoryCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSensoryCheckDto,
    @UploadedFiles() uploadedFiles: SensoryCheckUploadFields | undefined,
    @Request() req: any,
  ) {
    const uploadedImages = getUploadedSensoryCheckImages(uploadedFiles);

    if (uploadedImages.length > 1) {
      await Promise.all(uploadedImages.map(removeUploadedSensoryCheckImage));
      throw new BadRequestException('Only one sensory check image is allowed');
    }

    try {
      return await this.productionOrderSensoryChecksService.create(
        id,
        createDto,
        req.user,
        {
          imagePath: getSensoryCheckImagePath(uploadedImages[0]),
        },
      );
    } catch (error) {
      await Promise.all(uploadedImages.map(removeUploadedSensoryCheckImage));
      throw error;
    }
  }

  @Get(':id/date-checks')
  async findDateChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDateChecksService.findAllByProductionOrder(id);
  }

  @Post(':id/date-checks')
  @UseInterceptors(
    FileFieldsInterceptor(
      dateCheckRequestFileUploadFields,
      productionOrderDateCheckUploadOptions,
    ),
  )
  async createDateCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderDateCheckDto,
    @UploadedFiles() uploadedFiles: DateCheckUploadFields | undefined,
    @Request() req: any,
  ) {
    try {
      return await this.productionOrderDateChecksService.create(
        id,
        createDto,
        req.user,
        {
          requestFilePath: getDateCheckRequestFilePath(
            uploadedFiles?.request_file?.[0],
          ),
        },
      );
    } catch (error) {
      await removeUploadedDateCheckFiles(
        getUploadedDateCheckFiles(uploadedFiles),
      );
      throw error;
    }
  }

  @Get(':id/finished-product-summaries')
  async findFinishedProductSummaries(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderFinishedProductSummariesService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/finished-product-summaries')
  async createFinishedProductSummary(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderFinishedProductSummaryDto,
    @Request() req: any,
  ) {
    return this.productionOrderFinishedProductSummariesService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Post(':id/production-order-lines/export')
  async exportProductionOrderLines(
    @Param('id', ParseIntPipe) id: number,
    @Body() exportOptions: ExportProductionOrderLinesDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exportedFile =
      await this.productionOrdersService.exportProductionOrderLines(
        id,
        exportOptions,
      );
    const filenameFallback = getAsciiFilenameFallback(exportedFile.filename);
    const encodedFilename = encodeContentDispositionFilename(
      exportedFile.filename,
    );

    response.set({
      'Content-Disposition': `attachment; filename="${filenameFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': exportedFile.buffer.length,
      'Content-Type': exportedFile.contentType,
    });

    return new StreamableFile(exportedFile.buffer);
  }

  @Post(':id/production-order-lines/weighing-ticket/export')
  async exportWeighingTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() exportOptions: ExportProductionOrderLinesDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exportedFile =
      await this.productionOrdersService.exportWeighingTicket(
        id,
        exportOptions,
      );
    const filenameFallback = getAsciiFilenameFallback(exportedFile.filename);
    const encodedFilename = encodeContentDispositionFilename(
      exportedFile.filename,
    );

    response.set({
      'Content-Disposition': `attachment; filename="${filenameFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': exportedFile.buffer.length,
      'Content-Type': exportedFile.contentType,
    });

    return new StreamableFile(exportedFile.buffer);
  }

  @Post(':id/production-order-lines/post-weighing-material-check/export')
  async exportPostWeighingMaterialCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() exportOptions: ExportProductionOrderLinesDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exportedFile =
      await this.productionOrdersService.exportPostWeighingMaterialCheck(
        id,
        exportOptions,
      );
    const filenameFallback = getAsciiFilenameFallback(exportedFile.filename);
    const encodedFilename = encodeContentDispositionFilename(
      exportedFile.filename,
    );

    response.set({
      'Content-Disposition': `attachment; filename="${filenameFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': exportedFile.buffer.length,
      'Content-Type': exportedFile.contentType,
    });

    return new StreamableFile(exportedFile.buffer);
  }
}
