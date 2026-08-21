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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FilesInterceptor,
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
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
import { CreateProductionOrderDisinfectantPreparationDto } from './dto/create-production-order-disinfectant-preparation.dto';
import { UpdateProductionOrderDisinfectantPreparationDto } from './dto/update-production-order-disinfectant-preparation.dto';
import { ProductionOrderDisinfectantPreparationsService } from './production-order-disinfectant-preparations.service';
import { CreateProductionOrderEnvironmentCheckDto } from './dto/create-production-order-environment-check.dto';
import { UpdateProductionOrderEnvironmentCheckDto } from './dto/update-production-order-environment-check.dto';
import { ProductionOrderEnvironmentChecksService } from './production-order-environment-checks.service';
import { CreateProductionOrderHygieneCheckDto } from './dto/create-production-order-hygiene-check.dto';
import { UpdateProductionOrderHygieneCheckDto } from './dto/update-production-order-hygiene-check.dto';
import { ProductionOrderHygieneChecksService } from './production-order-hygiene-checks.service';
import { CreateProductionOrderLineClearanceCheckDto } from './dto/create-production-order-line-clearance-check.dto';
import { UpdateProductionOrderLineClearanceCheckDto } from './dto/update-production-order-line-clearance-check.dto';
import { ProductionOrderLineClearanceChecksService } from './production-order-line-clearance-checks.service';
import { CreateProductionOrderSecondaryPackagingCheckDto } from './dto/create-production-order-secondary-packaging-check.dto';
import { UpdateProductionOrderSecondaryPackagingCheckDto } from './dto/update-production-order-secondary-packaging-check.dto';
import { ProductionOrderSecondaryPackagingChecksService } from './production-order-secondary-packaging-checks.service';
import { CreateProductionOrderFinishedProductSummaryDto } from './dto/create-production-order-finished-product-summary.dto';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { CreateProductionOrderDensityCheckDto } from './dto/create-production-order-density-check.dto';
import { UpdateProductionOrderDensityCheckDto } from './dto/update-production-order-density-check.dto';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';
import { CreateProductionOrderFriabilityCheckDto } from './dto/create-production-order-friability-check.dto';
import { UpdateProductionOrderFriabilityCheckDto } from './dto/update-production-order-friability-check.dto';
import { ProductionOrderFriabilityChecksService } from './production-order-friability-checks.service';
import { CreateProductionOrderSprayDoseCheckDto } from './dto/create-production-order-spray-dose-check.dto';
import { UpdateProductionOrderSprayDoseCheckDto } from './dto/update-production-order-spray-dose-check.dto';
import { ProductionOrderSprayDoseChecksService } from './production-order-spray-dose-checks.service';
import { CreateProductionOrderPostHomogenizationGranuleCheckDto } from './dto/create-production-order-post-homogenization-granule-check.dto';
import { UpdateProductionOrderPostHomogenizationGranuleCheckDto } from './dto/update-production-order-post-homogenization-granule-check.dto';
import { ProductionOrderPostHomogenizationGranuleChecksService } from './production-order-post-homogenization-granule-checks.service';
import { CreateProductionOrderPostPreparationSolutionCheckDto } from './dto/create-production-order-post-preparation-solution-check.dto';
import { UpdateProductionOrderPostPreparationSolutionCheckDto } from './dto/update-production-order-post-preparation-solution-check.dto';
import { ProductionOrderPostPreparationSolutionChecksService } from './production-order-post-preparation-solution-checks.service';
import { CreateProductionOrderDisintegrationCheckDto } from './dto/create-production-order-disintegration-check.dto';
import { UpdateProductionOrderDisintegrationCheckDto } from './dto/update-production-order-disintegration-check.dto';
import { ProductionOrderDisintegrationChecksService } from './production-order-disintegration-checks.service';
import { CreateProductionOrderHardCapsuleLeakageCheckDto } from './dto/create-production-order-hard-capsule-leakage-check.dto';
import { UpdateProductionOrderHardCapsuleLeakageCheckDto } from './dto/update-production-order-hard-capsule-leakage-check.dto';
import { ProductionOrderHardCapsuleLeakageChecksService } from './production-order-hard-capsule-leakage-checks.service';
import { CreateProductionOrderVolumeCheckDto } from './dto/create-production-order-volume-check.dto';
import { UpdateProductionOrderVolumeCheckDto } from './dto/update-production-order-volume-check.dto';
import { ProductionOrderVolumeChecksService } from './production-order-volume-checks.service';
import { CreateProductionOrderShellWeightCheckDto } from './dto/create-production-order-shell-weight-check.dto';
import { UpdateProductionOrderShellWeightCheckDto } from './dto/update-production-order-shell-weight-check.dto';
import { ProductionOrderShellWeightChecksService } from './production-order-shell-weight-checks.service';
import { CreateProductionOrderTenShellWeightCheckDto } from './dto/create-production-order-ten-shell-weight-check.dto';
import { UpdateProductionOrderTenShellWeightCheckDto } from './dto/update-production-order-ten-shell-weight-check.dto';
import { ProductionOrderTenShellWeightChecksService } from './production-order-ten-shell-weight-checks.service';
import { CreateProductionOrderVialInspectionCheckDto } from './dto/create-production-order-vial-inspection-check.dto';
import { UpdateProductionOrderVialInspectionCheckDto } from './dto/update-production-order-vial-inspection-check.dto';
import { ProductionOrderVialInspectionChecksService } from './production-order-vial-inspection-checks.service';
import { CreateProductionOrderCylinderCalibrationDto } from './dto/create-production-order-cylinder-calibration.dto';
import { UpdateProductionOrderCylinderCalibrationDto } from './dto/update-production-order-cylinder-calibration.dto';
import { ProductionOrderCylinderCalibrationsService } from './production-order-cylinder-calibrations.service';
import { CreateProductionOrderSensoryCheckDto } from './dto/create-production-order-sensory-check.dto';
import { UpdateProductionOrderSensoryCheckDto } from './dto/update-production-order-sensory-check.dto';
import { ProductionOrderSensoryChecksService } from './production-order-sensory-checks.service';
import { CreateProductionOrderTenUnitSensoryCheckDto } from './dto/create-production-order-ten-unit-sensory-check.dto';
import { UpdateProductionOrderTenUnitSensoryCheckDto } from './dto/update-production-order-ten-unit-sensory-check.dto';
import { ProductionOrderTenUnitSensoryChecksService } from './production-order-ten-unit-sensory-checks.service';
import { CreateProductionOrderDateCheckDto } from './dto/create-production-order-date-check.dto';
import { UpdateProductionOrderDateCheckDto } from './dto/update-production-order-date-check.dto';
import { ApproveProductionOrderDateCheckDto } from './dto/approve-production-order-date-check.dto';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';
import { CreateProductionOrderSteamSterilizationCheckDto } from './dto/create-production-order-steam-sterilization-check.dto';
import { UpdateProductionOrderSteamSterilizationCheckDto } from './dto/update-production-order-steam-sterilization-check.dto';
import { ProductionOrderSteamSterilizationChecksService } from './production-order-steam-sterilization-checks.service';
import { CreateProductionOrderFiltrationCheckDto } from './dto/create-production-order-filtration-check.dto';
import { UpdateProductionOrderFiltrationCheckDto } from './dto/update-production-order-filtration-check.dto';
import { ProductionOrderFiltrationChecksService } from './production-order-filtration-checks.service';
import { CreateProductionOrderSemiFinishedGrossWeightCheckDto } from './dto/create-production-order-semi-finished-gross-weight-check.dto';
import { UpdateProductionOrderSemiFinishedGrossWeightCheckDto } from './dto/update-production-order-semi-finished-gross-weight-check.dto';
import { ProductionOrderSemiFinishedGrossWeightChecksService } from './production-order-semi-finished-gross-weight-checks.service';
import { CreateProductionOrderSemiFinishedNetWeightCheckDto } from './dto/create-production-order-semi-finished-net-weight-check.dto';
import { UpdateProductionOrderSemiFinishedNetWeightCheckDto } from './dto/update-production-order-semi-finished-net-weight-check.dto';
import { ProductionOrderSemiFinishedNetWeightChecksService } from './production-order-semi-finished-net-weight-checks.service';
import { CreateProductionOrderSemiFinishedProductSummaryDto } from './dto/create-production-order-semi-finished-product-summary.dto';
import { UpdateProductionOrderSemiFinishedProductSummaryDto } from './dto/update-production-order-semi-finished-product-summary.dto';
import { ProductionOrderSemiFinishedProductSummariesService } from './production-order-semi-finished-product-summaries.service';
import { CreateProductionOrderMaterialSummaryDto } from './dto/create-production-order-material-summary.dto';
import { UpdateProductionOrderMaterialSummaryDto } from './dto/update-production-order-material-summary.dto';
import { ProductionOrderMaterialSummariesService } from './production-order-material-summaries.service';
import { CreateProductionOrderMaterialProcessSummaryDto } from './dto/create-production-order-material-process-summary.dto';
import { UpdateProductionOrderMaterialProcessSummaryDto } from './dto/update-production-order-material-process-summary.dto';
import { ProductionOrderMaterialProcessSummariesService } from './production-order-material-process-summaries.service';
import { CreateProductionOrderLeakTightnessCheckDto } from './dto/create-production-order-leak-tightness-check.dto';
import { UpdateProductionOrderLeakTightnessCheckDto } from './dto/update-production-order-leak-tightness-check.dto';
import { ProductionOrderLeakTightnessChecksService } from './production-order-leak-tightness-checks.service';
import { CreateProductionOrderHardnessCheckDto } from './dto/create-production-order-hardness-check.dto';
import { UpdateProductionOrderHardnessCheckDto } from './dto/update-production-order-hardness-check.dto';
import { ProductionOrderHardnessChecksService } from './production-order-hardness-checks.service';
import { CreateProductionOrderTabletThicknessCheckDto } from './dto/create-production-order-tablet-thickness-check.dto';
import { UpdateProductionOrderTabletThicknessCheckDto } from './dto/update-production-order-tablet-thickness-check.dto';
import { ProductionOrderTabletThicknessChecksService } from './production-order-tablet-thickness-checks.service';
import { CreateProductionOrderFactoryReleaseReviewDto } from './dto/create-production-order-factory-release-review.dto';
import { UpdateProductionOrderFactoryReleaseReviewDto } from './dto/update-production-order-factory-release-review.dto';
import { ProductionOrderFactoryReleaseReviewsService } from './production-order-factory-release-reviews.service';
import { ProductionOrderDocumentControlsService } from './production-order-document-controls.service';
import { CreateProductionOrderPrimaryPackagingConfirmationDto } from './dto/create-production-order-primary-packaging-confirmation.dto';
import { UpdateProductionOrderPrimaryPackagingConfirmationDto } from './dto/update-production-order-primary-packaging-confirmation.dto';
import { ProductionOrderPrimaryPackagingConfirmationsService } from './production-order-primary-packaging-confirmations.service';
import { ProductionOrderProductionGuidesService } from './production-order-production-guides.service';
import { ProductionOrderAttachmentsService } from './production-order-attachments.service';
import { CreateProductionOrderAttachmentDto } from './dto/create-production-order-attachment.dto';
import { UpdateProductionOrderAttachmentDto } from './dto/update-production-order-attachment.dto';
import { ApproveProductionOrderAttachmentDto } from './dto/approve-production-order-attachment.dto';
import {
  getDateCheckImagePaths,
  getDateCheckRequestFilePath,
  MAX_DATE_CHECK_IMAGE_COUNT,
  productionOrderDateCheckUploadOptions,
  removeUploadedDateCheckFiles,
} from './production-order-date-check-upload.config';
import {
  getSensoryCheckImagePaths,
  MAX_SENSORY_CHECK_IMAGE_COUNT,
  productionOrderSensoryCheckImageUploadOptions,
  removeUploadedSensoryCheckImages,
} from './production-order-sensory-check-upload.config';
import {
  getMaterialProcessSummaryImagePath,
  productionOrderMaterialProcessSummaryImageUploadOptions,
  removeUploadedMaterialProcessSummaryImage,
} from './production-order-material-process-summary-upload.config';
import {
  getPostHomogenizationGranuleCheckImagePath,
  productionOrderPostHomogenizationGranuleCheckImageUploadOptions,
  removeUploadedPostHomogenizationGranuleCheckImage,
} from './production-order-post-homogenization-granule-check-upload.config';
import {
  getPostPreparationSolutionCheckImagePath,
  productionOrderPostPreparationSolutionCheckImageUploadOptions,
  removeUploadedPostPreparationSolutionCheckImage,
} from './production-order-post-preparation-solution-check-upload.config';
import {
  getSteamSterilizationCheckImagePath,
  productionOrderSteamSterilizationCheckImageUploadOptions,
  removeUploadedSteamSterilizationCheckImages,
} from './production-order-steam-sterilization-check-upload.config';
import {
  productionOrderProductionGuideUploadOptions,
  removeUploadedProductionGuide,
} from './production-order-production-guide-upload.config';
import {
  MAX_PRODUCTION_ORDER_ATTACHMENT_FILE_COUNT,
  productionOrderAttachmentUploadOptions,
  removeUploadedProductionOrderAttachmentFiles,
} from './production-order-attachment-upload.config';

type DateCheckUploadFields = {
  request_file?: Express.Multer.File[];
  images?: Express.Multer.File[];
  image?: Express.Multer.File[];
};

type SensoryCheckUploadFields = {
  images?: Express.Multer.File[];
  sensory_image?: Express.Multer.File[];
  image?: Express.Multer.File[];
};

type MaterialProcessSummaryUploadFields = {
  image?: Express.Multer.File[];
};

type PostHomogenizationGranuleCheckUploadFields = {
  granule_image?: Express.Multer.File[];
  image?: Express.Multer.File[];
};

type PostPreparationSolutionCheckUploadFields = {
  final_volume_image?: Express.Multer.File[];
  solution_image?: Express.Multer.File[];
};

type SteamSterilizationCheckUploadFields = {
  configuration_image?: Express.Multer.File[];
  indicator_image?: Express.Multer.File[];
  reached_temperature_image?: Express.Multer.File[];
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
) => [
  ...(uploadedFiles?.images ?? []),
  ...(uploadedFiles?.sensory_image ?? []),
  ...(uploadedFiles?.image ?? []),
];

const sensoryCheckImageUploadFields = [
  { name: 'images', maxCount: MAX_SENSORY_CHECK_IMAGE_COUNT },
  { name: 'sensory_image', maxCount: MAX_SENSORY_CHECK_IMAGE_COUNT },
  { name: 'image', maxCount: MAX_SENSORY_CHECK_IMAGE_COUNT },
];

const getUploadedMaterialProcessSummaryImages = (
  uploadedFiles?: MaterialProcessSummaryUploadFields,
) => uploadedFiles?.image ?? [];

const getUploadedPostHomogenizationGranuleCheckImages = (
  uploadedFiles?: PostHomogenizationGranuleCheckUploadFields,
) => [...(uploadedFiles?.granule_image ?? []), ...(uploadedFiles?.image ?? [])];

const getUploadedPostPreparationSolutionCheckImages = (
  uploadedFiles?: PostPreparationSolutionCheckUploadFields,
) => [
  ...(uploadedFiles?.final_volume_image ?? []),
  ...(uploadedFiles?.solution_image ?? []),
];

const getPostPreparationSolutionCheckUploadedImagePaths = (
  uploadedFiles?: PostPreparationSolutionCheckUploadFields,
) => ({
  finalVolumeImagePath: getPostPreparationSolutionCheckImagePath(
    uploadedFiles?.final_volume_image?.[0],
  ),
  solutionImagePath: getPostPreparationSolutionCheckImagePath(
    uploadedFiles?.solution_image?.[0],
  ),
});

const steamSterilizationCheckImageUploadFields = [
  { name: 'configuration_image', maxCount: 1 },
  { name: 'indicator_image', maxCount: 1 },
  { name: 'reached_temperature_image', maxCount: 1 },
];

const getUploadedSteamSterilizationCheckImages = (
  uploadedFiles?: SteamSterilizationCheckUploadFields,
) => [
  ...(uploadedFiles?.configuration_image ?? []),
  ...(uploadedFiles?.indicator_image ?? []),
  ...(uploadedFiles?.reached_temperature_image ?? []),
];

const getSteamSterilizationCheckUploadedImagePaths = (
  uploadedFiles?: SteamSterilizationCheckUploadFields,
) => ({
  configurationImagePath: getSteamSterilizationCheckImagePath(
    uploadedFiles?.configuration_image?.[0],
  ),
  indicatorImagePath: getSteamSterilizationCheckImagePath(
    uploadedFiles?.indicator_image?.[0],
  ),
  reachedTemperatureImagePath: getSteamSterilizationCheckImagePath(
    uploadedFiles?.reached_temperature_image?.[0],
  ),
});

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
    private readonly productionOrderDisinfectantPreparationsService: ProductionOrderDisinfectantPreparationsService,
    private readonly productionOrderEnvironmentChecksService: ProductionOrderEnvironmentChecksService,
    private readonly productionOrderHygieneChecksService: ProductionOrderHygieneChecksService,
    private readonly productionOrderLineClearanceChecksService: ProductionOrderLineClearanceChecksService,
    private readonly productionOrderSecondaryPackagingChecksService: ProductionOrderSecondaryPackagingChecksService,
    private readonly productionOrderFinishedProductSummariesService: ProductionOrderFinishedProductSummariesService,
    private readonly productionOrderDensityChecksService: ProductionOrderDensityChecksService,
    private readonly productionOrderFriabilityChecksService: ProductionOrderFriabilityChecksService,
    private readonly productionOrderSprayDoseChecksService: ProductionOrderSprayDoseChecksService,
    private readonly productionOrderPostHomogenizationGranuleChecksService: ProductionOrderPostHomogenizationGranuleChecksService,
    private readonly productionOrderPostPreparationSolutionChecksService: ProductionOrderPostPreparationSolutionChecksService,
    private readonly productionOrderDisintegrationChecksService: ProductionOrderDisintegrationChecksService,
    private readonly productionOrderHardCapsuleLeakageChecksService: ProductionOrderHardCapsuleLeakageChecksService,
    private readonly productionOrderVolumeChecksService: ProductionOrderVolumeChecksService,
    private readonly productionOrderShellWeightChecksService: ProductionOrderShellWeightChecksService,
    private readonly productionOrderTenShellWeightChecksService: ProductionOrderTenShellWeightChecksService,
    private readonly productionOrderVialInspectionChecksService: ProductionOrderVialInspectionChecksService,
    private readonly productionOrderCylinderCalibrationsService: ProductionOrderCylinderCalibrationsService,
    private readonly productionOrderSensoryChecksService: ProductionOrderSensoryChecksService,
    private readonly productionOrderTenUnitSensoryChecksService: ProductionOrderTenUnitSensoryChecksService,
    private readonly productionOrderDateChecksService: ProductionOrderDateChecksService,
    private readonly productionOrderSteamSterilizationChecksService: ProductionOrderSteamSterilizationChecksService,
    private readonly productionOrderFiltrationChecksService: ProductionOrderFiltrationChecksService,
    private readonly productionOrderSemiFinishedGrossWeightChecksService: ProductionOrderSemiFinishedGrossWeightChecksService,
    private readonly productionOrderSemiFinishedNetWeightChecksService: ProductionOrderSemiFinishedNetWeightChecksService,
    private readonly productionOrderSemiFinishedProductSummariesService: ProductionOrderSemiFinishedProductSummariesService,
    private readonly productionOrderMaterialSummariesService: ProductionOrderMaterialSummariesService,
    private readonly productionOrderMaterialProcessSummariesService: ProductionOrderMaterialProcessSummariesService,
    private readonly productionOrderLeakTightnessChecksService: ProductionOrderLeakTightnessChecksService,
    private readonly productionOrderHardnessChecksService: ProductionOrderHardnessChecksService,
    private readonly productionOrderTabletThicknessChecksService: ProductionOrderTabletThicknessChecksService,
    private readonly productionOrderFactoryReleaseReviewsService: ProductionOrderFactoryReleaseReviewsService,
    private readonly productionOrderDocumentControlsService: ProductionOrderDocumentControlsService,
    private readonly productionOrderPrimaryPackagingConfirmationsService: ProductionOrderPrimaryPackagingConfirmationsService,
    private readonly productionOrderProductionGuidesService: ProductionOrderProductionGuidesService,
    private readonly productionOrderAttachmentsService: ProductionOrderAttachmentsService,
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

  @Patch('environment-checks/:checkId')
  async updateEnvironmentCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderEnvironmentCheckDto,
  ) {
    return this.productionOrderEnvironmentChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('environment-checks/:checkId')
  async deleteEnvironmentCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderEnvironmentChecksService.delete(checkId);
  }

  @Get('hygiene-checks/:checkId')
  async findHygieneCheckById(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderHygieneChecksService.findById(checkId);
  }

  @Patch('hygiene-checks/:checkId')
  async updateHygieneCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderHygieneCheckDto,
  ) {
    return this.productionOrderHygieneChecksService.update(checkId, updateDto);
  }

  @Delete('hygiene-checks/:checkId')
  async deleteHygieneCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderHygieneChecksService.delete(checkId);
  }

  @Get('line-clearance-checks/:checkId')
  async findLineClearanceCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderLineClearanceChecksService.findById(checkId);
  }

  @Patch('line-clearance-checks/:checkId')
  async updateLineClearanceCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderLineClearanceCheckDto,
  ) {
    return this.productionOrderLineClearanceChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('line-clearance-checks/:checkId')
  async deleteLineClearanceCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderLineClearanceChecksService.delete(checkId);
  }

  @Get('secondary-packaging-checks/:checkId')
  async findSecondaryPackagingCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSecondaryPackagingChecksService.findById(
      checkId,
    );
  }

  @Patch('secondary-packaging-checks/:checkId')
  async updateSecondaryPackagingCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderSecondaryPackagingCheckDto,
  ) {
    return this.productionOrderSecondaryPackagingChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('secondary-packaging-checks/:checkId')
  async deleteSecondaryPackagingCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSecondaryPackagingChecksService.delete(checkId);
  }

  @Get('factory-release-reviews/:reviewId')
  async findFactoryReleaseReviewById(
    @Param('reviewId', ParseIntPipe) reviewId: number,
  ) {
    return this.productionOrderFactoryReleaseReviewsService.findById(reviewId);
  }

  @Patch('factory-release-reviews/:reviewId')
  async updateFactoryReleaseReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() updateDto: UpdateProductionOrderFactoryReleaseReviewDto,
  ) {
    return this.productionOrderFactoryReleaseReviewsService.update(
      reviewId,
      updateDto,
    );
  }

  @Delete('factory-release-reviews/:reviewId')
  async deleteFactoryReleaseReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
  ) {
    return this.productionOrderFactoryReleaseReviewsService.delete(reviewId);
  }

  @Get('primary-packaging-confirmations/:confirmationId')
  async findPrimaryPackagingConfirmationById(
    @Param('confirmationId', ParseIntPipe) confirmationId: number,
  ) {
    return this.productionOrderPrimaryPackagingConfirmationsService.findById(
      confirmationId,
    );
  }

  @Patch('primary-packaging-confirmations/:confirmationId')
  async updatePrimaryPackagingConfirmation(
    @Param('confirmationId', ParseIntPipe) confirmationId: number,
    @Body() updateDto: UpdateProductionOrderPrimaryPackagingConfirmationDto,
  ) {
    return this.productionOrderPrimaryPackagingConfirmationsService.update(
      confirmationId,
      updateDto,
    );
  }

  @Delete('primary-packaging-confirmations/:confirmationId')
  async deletePrimaryPackagingConfirmation(
    @Param('confirmationId', ParseIntPipe) confirmationId: number,
  ) {
    return this.productionOrderPrimaryPackagingConfirmationsService.delete(
      confirmationId,
    );
  }

  @Get('density-checks/:checkId')
  async findDensityCheckById(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderDensityChecksService.findById(checkId);
  }

  @Patch('density-checks/:checkId')
  async updateDensityCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderDensityCheckDto,
  ) {
    return this.productionOrderDensityChecksService.update(checkId, updateDto);
  }

  @Delete('density-checks/:checkId')
  async deleteDensityCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderDensityChecksService.delete(checkId);
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

  @Get('disinfectant-preparations/:preparationId')
  async findDisinfectantPreparationById(
    @Param('preparationId', ParseIntPipe) preparationId: number,
  ) {
    return this.productionOrderDisinfectantPreparationsService.findById(
      preparationId,
    );
  }

  @Patch('disinfectant-preparations/:preparationId')
  async updateDisinfectantPreparation(
    @Param('preparationId', ParseIntPipe) preparationId: number,
    @Body() updateDto: UpdateProductionOrderDisinfectantPreparationDto,
  ) {
    return this.productionOrderDisinfectantPreparationsService.update(
      preparationId,
      updateDto,
    );
  }

  @Delete('disinfectant-preparations/:preparationId')
  async deleteDisinfectantPreparation(
    @Param('preparationId', ParseIntPipe) preparationId: number,
  ) {
    return this.productionOrderDisinfectantPreparationsService.delete(
      preparationId,
    );
  }

  @Get('friability-checks/:checkId')
  async findFriabilityCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderFriabilityChecksService.findById(checkId);
  }

  @Patch('friability-checks/:checkId')
  async updateFriabilityCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderFriabilityCheckDto,
  ) {
    return this.productionOrderFriabilityChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('friability-checks/:checkId')
  async deleteFriabilityCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderFriabilityChecksService.delete(checkId);
  }

  @Get('spray-dose-checks/:checkId')
  async findSprayDoseCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSprayDoseChecksService.findById(checkId);
  }

  @Patch('spray-dose-checks/:checkId')
  async updateSprayDoseCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderSprayDoseCheckDto,
  ) {
    return this.productionOrderSprayDoseChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('spray-dose-checks/:checkId')
  async deleteSprayDoseCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderSprayDoseChecksService.delete(checkId);
  }

  @Get('post-homogenization-granule-checks/:checkId')
  async findPostHomogenizationGranuleCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderPostHomogenizationGranuleChecksService.findById(
      checkId,
    );
  }

  @Patch('post-homogenization-granule-checks/:checkId')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'granule_image', maxCount: 1 },
        { name: 'image', maxCount: 1 },
      ],
      productionOrderPostHomogenizationGranuleCheckImageUploadOptions,
    ),
  )
  async updatePostHomogenizationGranuleCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderPostHomogenizationGranuleCheckDto,
    @UploadedFiles()
    uploadedFiles: PostHomogenizationGranuleCheckUploadFields | undefined,
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
      return await this.productionOrderPostHomogenizationGranuleChecksService.update(
        checkId,
        updateDto,
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

  @Delete('post-homogenization-granule-checks/:checkId')
  async deletePostHomogenizationGranuleCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderPostHomogenizationGranuleChecksService.delete(
      checkId,
    );
  }

  @Get('post-preparation-solution-checks/:checkId')
  async findPostPreparationSolutionCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderPostPreparationSolutionChecksService.findById(
      checkId,
    );
  }

  @Patch('post-preparation-solution-checks/:checkId')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'final_volume_image', maxCount: 1 },
        { name: 'solution_image', maxCount: 1 },
      ],
      productionOrderPostPreparationSolutionCheckImageUploadOptions,
    ),
  )
  async updatePostPreparationSolutionCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderPostPreparationSolutionCheckDto,
    @UploadedFiles()
    uploadedFiles: PostPreparationSolutionCheckUploadFields | undefined,
  ) {
    const uploadedImages =
      getUploadedPostPreparationSolutionCheckImages(uploadedFiles);

    try {
      return await this.productionOrderPostPreparationSolutionChecksService.update(
        checkId,
        updateDto,
        getPostPreparationSolutionCheckUploadedImagePaths(uploadedFiles),
      );
    } catch (error) {
      await Promise.all(
        uploadedImages.map(removeUploadedPostPreparationSolutionCheckImage),
      );
      throw error;
    }
  }

  @Delete('post-preparation-solution-checks/:checkId')
  async deletePostPreparationSolutionCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderPostPreparationSolutionChecksService.delete(
      checkId,
    );
  }

  @Get('disintegration-checks/:checkId')
  async findDisintegrationCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderDisintegrationChecksService.findById(checkId);
  }

  @Patch('disintegration-checks/:checkId')
  async updateDisintegrationCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderDisintegrationCheckDto,
  ) {
    return this.productionOrderDisintegrationChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('disintegration-checks/:checkId')
  async deleteDisintegrationCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderDisintegrationChecksService.delete(checkId);
  }

  @Get('hard-capsule-leakage-checks/:checkId')
  async findHardCapsuleLeakageCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderHardCapsuleLeakageChecksService.findById(
      checkId,
    );
  }

  @Patch('hard-capsule-leakage-checks/:checkId')
  async updateHardCapsuleLeakageCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderHardCapsuleLeakageCheckDto,
  ) {
    return this.productionOrderHardCapsuleLeakageChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('hard-capsule-leakage-checks/:checkId')
  async deleteHardCapsuleLeakageCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderHardCapsuleLeakageChecksService.delete(checkId);
  }

  @Get('volume-checks/:checkId')
  async findVolumeCheckById(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderVolumeChecksService.findById(checkId);
  }

  @Patch('volume-checks/:checkId')
  async updateVolumeCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderVolumeCheckDto,
  ) {
    return this.productionOrderVolumeChecksService.update(checkId, updateDto);
  }

  @Delete('volume-checks/:checkId')
  async deleteVolumeCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderVolumeChecksService.delete(checkId);
  }

  @Get('shell-weight-checks/:checkId')
  async findShellWeightCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderShellWeightChecksService.findById(checkId);
  }

  @Patch('shell-weight-checks/:checkId')
  async updateShellWeightCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderShellWeightCheckDto,
  ) {
    return this.productionOrderShellWeightChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('shell-weight-checks/:checkId')
  async deleteShellWeightCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderShellWeightChecksService.delete(checkId);
  }

  @Get('ten-shell-weight-checks/:checkId')
  async findTenShellWeightCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderTenShellWeightChecksService.findById(checkId);
  }

  @Patch('ten-shell-weight-checks/:checkId')
  async updateTenShellWeightCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderTenShellWeightCheckDto,
  ) {
    return this.productionOrderTenShellWeightChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('ten-shell-weight-checks/:checkId')
  async deleteTenShellWeightCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderTenShellWeightChecksService.delete(checkId);
  }

  @Get('semi-finished-gross-weight-checks/:checkId')
  async findSemiFinishedGrossWeightCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSemiFinishedGrossWeightChecksService.findById(
      checkId,
    );
  }

  @Patch('semi-finished-gross-weight-checks/:checkId')
  async updateSemiFinishedGrossWeightCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderSemiFinishedGrossWeightCheckDto,
  ) {
    return this.productionOrderSemiFinishedGrossWeightChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('semi-finished-gross-weight-checks/:checkId')
  async deleteSemiFinishedGrossWeightCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSemiFinishedGrossWeightChecksService.delete(
      checkId,
    );
  }

  @Get('semi-finished-net-weight-checks/:checkId')
  async findSemiFinishedNetWeightCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSemiFinishedNetWeightChecksService.findById(
      checkId,
    );
  }

  @Get('semi-finished-product-summaries/:summaryId')
  async findSemiFinishedProductSummaryById(
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.productionOrderSemiFinishedProductSummariesService.findById(
      summaryId,
    );
  }

  @Patch('semi-finished-product-summaries/:summaryId')
  async updateSemiFinishedProductSummary(
    @Param('summaryId', ParseIntPipe) summaryId: number,
    @Body() updateDto: UpdateProductionOrderSemiFinishedProductSummaryDto,
  ) {
    return this.productionOrderSemiFinishedProductSummariesService.update(
      summaryId,
      updateDto,
    );
  }

  @Delete('semi-finished-product-summaries/:summaryId')
  async deleteSemiFinishedProductSummary(
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.productionOrderSemiFinishedProductSummariesService.delete(
      summaryId,
    );
  }

  @Get('material-summaries/:summaryId')
  async findMaterialSummaryById(
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.productionOrderMaterialSummariesService.findById(summaryId);
  }

  @Patch('material-summaries/:summaryId')
  async updateMaterialSummary(
    @Param('summaryId', ParseIntPipe) summaryId: number,
    @Body() updateDto: UpdateProductionOrderMaterialSummaryDto,
  ) {
    return this.productionOrderMaterialSummariesService.update(
      summaryId,
      updateDto,
    );
  }

  @Delete('material-summaries/:summaryId')
  async deleteMaterialSummary(
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.productionOrderMaterialSummariesService.delete(summaryId);
  }

  @Get('material-process-summaries/:summaryId')
  async findMaterialProcessSummaryById(
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.productionOrderMaterialProcessSummariesService.findById(
      summaryId,
    );
  }

  @Patch('material-process-summaries/:summaryId')
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'image', maxCount: 1 }],
      productionOrderMaterialProcessSummaryImageUploadOptions,
    ),
  )
  async updateMaterialProcessSummary(
    @Param('summaryId', ParseIntPipe) summaryId: number,
    @Body() updateDto: UpdateProductionOrderMaterialProcessSummaryDto,
    @UploadedFiles()
    uploadedFiles: MaterialProcessSummaryUploadFields | undefined,
  ) {
    const uploadedImages =
      getUploadedMaterialProcessSummaryImages(uploadedFiles);

    try {
      return await this.productionOrderMaterialProcessSummariesService.update(
        summaryId,
        updateDto,
        { imagePath: getMaterialProcessSummaryImagePath(uploadedImages[0]) },
      );
    } catch (error) {
      await Promise.all(
        uploadedImages.map(removeUploadedMaterialProcessSummaryImage),
      );
      throw error;
    }
  }

  @Delete('material-process-summaries/:summaryId')
  async deleteMaterialProcessSummary(
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.productionOrderMaterialProcessSummariesService.delete(
      summaryId,
    );
  }

  @Patch('semi-finished-net-weight-checks/:checkId')
  async updateSemiFinishedNetWeightCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderSemiFinishedNetWeightCheckDto,
  ) {
    return this.productionOrderSemiFinishedNetWeightChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('semi-finished-net-weight-checks/:checkId')
  async deleteSemiFinishedNetWeightCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSemiFinishedNetWeightChecksService.delete(
      checkId,
    );
  }

  @Get('leak-tightness-checks/:checkId')
  async findLeakTightnessCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderLeakTightnessChecksService.findById(checkId);
  }

  @Patch('leak-tightness-checks/:checkId')
  async updateLeakTightnessCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderLeakTightnessCheckDto,
  ) {
    return this.productionOrderLeakTightnessChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('leak-tightness-checks/:checkId')
  async deleteLeakTightnessCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderLeakTightnessChecksService.delete(checkId);
  }

  @Get('hardness-checks/:checkId')
  async findHardnessCheckById(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderHardnessChecksService.findById(checkId);
  }

  @Patch('hardness-checks/:checkId')
  async updateHardnessCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderHardnessCheckDto,
  ) {
    return this.productionOrderHardnessChecksService.update(checkId, updateDto);
  }

  @Delete('hardness-checks/:checkId')
  async deleteHardnessCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderHardnessChecksService.delete(checkId);
  }

  @Get('tablet-thickness-checks/:checkId')
  async findTabletThicknessCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderTabletThicknessChecksService.findById(checkId);
  }

  @Patch('tablet-thickness-checks/:checkId')
  async updateTabletThicknessCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderTabletThicknessCheckDto,
  ) {
    return this.productionOrderTabletThicknessChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('tablet-thickness-checks/:checkId')
  async deleteTabletThicknessCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderTabletThicknessChecksService.delete(checkId);
  }

  @Get('vial-inspection-checks/:checkId')
  async findVialInspectionCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderVialInspectionChecksService.findById(checkId);
  }

  @Patch('vial-inspection-checks/:checkId')
  async updateVialInspectionCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderVialInspectionCheckDto,
  ) {
    return this.productionOrderVialInspectionChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('vial-inspection-checks/:checkId')
  async deleteVialInspectionCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderVialInspectionChecksService.delete(checkId);
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

  @Get('attachments/files/:filename')
  async getProductionOrderAttachmentFile(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file =
      await this.productionOrderAttachmentsService.findFile(filename);

    if (!file) {
      throw new NotFoundException('Production order attachment file not found');
    }

    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': file.size,
      'Content-Type': file.contentType,
    });

    return new StreamableFile(createReadStream(file.filePath));
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

  @Get('material-process-summaries/images/:filename')
  async getMaterialProcessSummaryImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const imageFile =
      await this.productionOrderMaterialProcessSummariesService.findImageFile(
        filename,
      );

    if (!imageFile) {
      throw new NotFoundException('Material process summary image not found');
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

  @Get('post-preparation-solution-checks/images/:filename')
  async getPostPreparationSolutionCheckImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const imageFile =
      await this.productionOrderPostPreparationSolutionChecksService.findImageFile(
        filename,
      );

    if (!imageFile) {
      throw new NotFoundException(
        'Post-preparation solution check image not found',
      );
    }

    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': imageFile.size,
      'Content-Type': imageFile.contentType,
    });

    return new StreamableFile(createReadStream(imageFile.filePath));
  }

  @Get('steam-sterilization-checks/images/:filename')
  async getSteamSterilizationCheckImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const imageFile =
      await this.productionOrderSteamSterilizationChecksService.findImageFile(
        filename,
      );

    if (!imageFile) {
      throw new NotFoundException('Steam sterilization check image not found');
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

  @Patch('sensory-checks/:checkId')
  async updateSensoryCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderSensoryCheckDto,
  ) {
    return this.productionOrderSensoryChecksService.update(checkId, updateDto);
  }

  @Post('sensory-checks/:checkId/images')
  @UseInterceptors(
    FileFieldsInterceptor(
      sensoryCheckImageUploadFields,
      productionOrderSensoryCheckImageUploadOptions,
    ),
  )
  async addSensoryCheckImages(
    @Param('checkId', ParseIntPipe) checkId: number,
    @UploadedFiles() uploadedFiles: SensoryCheckUploadFields | undefined,
    @Request() req: any,
  ) {
    const uploadedImages = getUploadedSensoryCheckImages(uploadedFiles);

    if (uploadedImages.length > MAX_SENSORY_CHECK_IMAGE_COUNT) {
      await removeUploadedSensoryCheckImages(uploadedImages);
      throw new BadRequestException(
        `images cannot exceed ${MAX_SENSORY_CHECK_IMAGE_COUNT} files per sensory check`,
      );
    }

    try {
      return await this.productionOrderSensoryChecksService.addImages(
        checkId,
        getSensoryCheckImagePaths(uploadedImages),
        req.user,
      );
    } catch (error) {
      await removeUploadedSensoryCheckImages(uploadedImages);
      throw error;
    }
  }

  @Delete('sensory-checks/images/:imageId')
  async deleteSensoryCheckImage(
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.productionOrderSensoryChecksService.deleteImage(imageId);
  }

  @Delete('sensory-checks/:checkId')
  async deleteSensoryCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderSensoryChecksService.delete(checkId);
  }

  @Get('ten-unit-sensory-checks/:checkId')
  async findTenUnitSensoryCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderTenUnitSensoryChecksService.findById(checkId);
  }

  @Patch('ten-unit-sensory-checks/:checkId')
  async updateTenUnitSensoryCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderTenUnitSensoryCheckDto,
  ) {
    return this.productionOrderTenUnitSensoryChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('ten-unit-sensory-checks/:checkId')
  async deleteTenUnitSensoryCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderTenUnitSensoryChecksService.delete(checkId);
  }

  @Get('steam-sterilization-checks/:checkId')
  async findSteamSterilizationCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSteamSterilizationChecksService.findById(
      checkId,
    );
  }

  @Patch('steam-sterilization-checks/:checkId')
  @UseInterceptors(
    FileFieldsInterceptor(
      steamSterilizationCheckImageUploadFields,
      productionOrderSteamSterilizationCheckImageUploadOptions,
    ),
  )
  async updateSteamSterilizationCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderSteamSterilizationCheckDto,
    @UploadedFiles()
    uploadedFiles: SteamSterilizationCheckUploadFields | undefined,
  ) {
    const uploadedImages =
      getUploadedSteamSterilizationCheckImages(uploadedFiles);

    try {
      return await this.productionOrderSteamSterilizationChecksService.update(
        checkId,
        updateDto,
        getSteamSterilizationCheckUploadedImagePaths(uploadedFiles),
      );
    } catch (error) {
      await removeUploadedSteamSterilizationCheckImages(uploadedImages);
      throw error;
    }
  }

  @Delete('steam-sterilization-checks/:checkId')
  async deleteSteamSterilizationCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderSteamSterilizationChecksService.delete(checkId);
  }

  @Get('filtration-checks/:checkId')
  async findFiltrationCheckById(
    @Param('checkId', ParseIntPipe) checkId: number,
  ) {
    return this.productionOrderFiltrationChecksService.findById(checkId);
  }

  @Patch('filtration-checks/:checkId')
  async updateFiltrationCheck(
    @Param('checkId', ParseIntPipe) checkId: number,
    @Body() updateDto: UpdateProductionOrderFiltrationCheckDto,
  ) {
    return this.productionOrderFiltrationChecksService.update(
      checkId,
      updateDto,
    );
  }

  @Delete('filtration-checks/:checkId')
  async deleteFiltrationCheck(@Param('checkId', ParseIntPipe) checkId: number) {
    return this.productionOrderFiltrationChecksService.delete(checkId);
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

  @Get('attachments/:attachmentId')
  async findProductionOrderAttachmentById(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.productionOrderAttachmentsService.findById(attachmentId);
  }

  @Patch('attachments/:attachmentId')
  async updateProductionOrderAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Body() updateDto: UpdateProductionOrderAttachmentDto,
  ) {
    return this.productionOrderAttachmentsService.update(
      attachmentId,
      updateDto,
    );
  }

  @Patch('attachments/:attachmentId/approval')
  async approveProductionOrderAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Body() approveDto: ApproveProductionOrderAttachmentDto,
    @Request() request: any,
  ) {
    return this.productionOrderAttachmentsService.approve(
      attachmentId,
      approveDto,
      request.user,
    );
  }

  @Post('attachments/:attachmentId/files')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_PRODUCTION_ORDER_ATTACHMENT_FILE_COUNT,
      productionOrderAttachmentUploadOptions,
    ),
  )
  async addProductionOrderAttachmentFiles(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    try {
      return await this.productionOrderAttachmentsService.addFiles(
        attachmentId,
        files ?? [],
      );
    } catch (error) {
      await removeUploadedProductionOrderAttachmentFiles(files);
      throw error;
    }
  }

  @Delete('attachments/files/:fileId')
  async deleteProductionOrderAttachmentFile(
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    return this.productionOrderAttachmentsService.deleteFile(fileId);
  }

  @Delete('attachments/:attachmentId')
  async deleteProductionOrderAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.productionOrderAttachmentsService.delete(attachmentId);
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

  @Get(':id/production-guide')
  async findProductionGuide(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderProductionGuidesService.findByProductionOrder(
      id,
    );
  }

  @Get(':id/production-guide/file')
  async downloadProductionGuide(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { productionGuide, file } =
      await this.productionOrderProductionGuidesService.getFile(id);
    const filenameFallback = getAsciiFilenameFallback(
      productionGuide.original_filename,
    );
    const encodedFilename = encodeContentDispositionFilename(
      productionGuide.original_filename,
    );

    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `attachment; filename="${filenameFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': file.size,
      'Content-Type': productionGuide.mime_type,
    });

    return new StreamableFile(createReadStream(file.filePath));
  }

  @Post(':id/production-guide')
  @UseInterceptors(
    FileInterceptor('file', productionOrderProductionGuideUploadOptions),
  )
  async uploadProductionGuide(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    try {
      return await this.productionOrderProductionGuidesService.upload(id, file);
    } catch (error) {
      await removeUploadedProductionGuide(file);
      throw error;
    }
  }

  @Delete(':id/production-guide')
  async deleteProductionGuide(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderProductionGuidesService.delete(id);
  }

  @Get(':id/production-order-lines')
  async findProductionOrderLines(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrdersService.findProductionOrderLines(id);
  }

  @Get(':id/document-control')
  async findDocumentControl(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDocumentControlsService.findByProductionOrder(
      id,
    );
  }

  @Patch(':id/document-control/issue-batch-record')
  async issueBatchRecord(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.productionOrderDocumentControlsService.issueBatchRecord(
      id,
      req.user,
    );
  }

  @Patch(':id/document-control/receive-batch-record')
  async receiveBatchRecord(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.productionOrderDocumentControlsService.receiveBatchRecord(
      id,
      req.user,
    );
  }

  @Patch(':id/document-control/receive-test-certificate')
  async receiveTestCertificate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.productionOrderDocumentControlsService.receiveTestCertificate(
      id,
      req.user,
    );
  }

  @Patch(':id/document-control/receive-warehouse-release')
  async receiveWarehouseRelease(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.productionOrderDocumentControlsService.receiveWarehouseRelease(
      id,
      req.user,
    );
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

  @Get(':id/disinfectant-preparations')
  async findDisinfectantPreparations(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDisinfectantPreparationsService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/disinfectant-preparations')
  async createDisinfectantPreparation(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderDisinfectantPreparationDto,
    @Request() req: any,
  ) {
    return this.productionOrderDisinfectantPreparationsService.create(
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

  @Get(':id/hygiene-checks')
  async findHygieneChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderHygieneChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/hygiene-checks')
  async createHygieneCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderHygieneCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderHygieneChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/line-clearance-checks')
  async findLineClearanceChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderLineClearanceChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/line-clearance-checks')
  async createLineClearanceCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderLineClearanceCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderLineClearanceChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/secondary-packaging-checks')
  async findSecondaryPackagingChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderSecondaryPackagingChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/secondary-packaging-checks')
  async createSecondaryPackagingCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSecondaryPackagingCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderSecondaryPackagingChecksService.create(
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

  @Get(':id/post-preparation-solution-checks')
  async findPostPreparationSolutionChecks(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productionOrderPostPreparationSolutionChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/post-preparation-solution-checks')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'final_volume_image', maxCount: 1 },
        { name: 'solution_image', maxCount: 1 },
      ],
      productionOrderPostPreparationSolutionCheckImageUploadOptions,
    ),
  )
  async createPostPreparationSolutionCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderPostPreparationSolutionCheckDto,
    @UploadedFiles()
    uploadedFiles: PostPreparationSolutionCheckUploadFields | undefined,
  ) {
    const uploadedImages =
      getUploadedPostPreparationSolutionCheckImages(uploadedFiles);

    try {
      return await this.productionOrderPostPreparationSolutionChecksService.create(
        id,
        createDto,
        getPostPreparationSolutionCheckUploadedImagePaths(uploadedFiles),
      );
    } catch (error) {
      await Promise.all(
        uploadedImages.map(removeUploadedPostPreparationSolutionCheckImage),
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

  @Get(':id/volume-checks')
  async findVolumeChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderVolumeChecksService.findAllByProductionOrder(id);
  }

  @Post(':id/volume-checks')
  async createVolumeCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderVolumeCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderVolumeChecksService.create(
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

  @Get(':id/semi-finished-gross-weight-checks')
  async findSemiFinishedGrossWeightChecks(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productionOrderSemiFinishedGrossWeightChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/semi-finished-gross-weight-checks')
  async createSemiFinishedGrossWeightCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSemiFinishedGrossWeightCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderSemiFinishedGrossWeightChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/semi-finished-net-weight-checks')
  async findSemiFinishedNetWeightChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderSemiFinishedNetWeightChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/semi-finished-net-weight-checks')
  async createSemiFinishedNetWeightCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSemiFinishedNetWeightCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderSemiFinishedNetWeightChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/semi-finished-product-summaries')
  async findSemiFinishedProductSummaries(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productionOrderSemiFinishedProductSummariesService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/semi-finished-product-summaries')
  async createSemiFinishedProductSummary(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSemiFinishedProductSummaryDto,
    @Request() req: any,
  ) {
    return this.productionOrderSemiFinishedProductSummariesService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/material-summaries')
  async findMaterialSummaries(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderMaterialSummariesService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/material-summaries')
  async createMaterialSummary(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderMaterialSummaryDto,
    @Request() req: any,
  ) {
    return this.productionOrderMaterialSummariesService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/material-process-summaries')
  async findMaterialProcessSummaries(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderMaterialProcessSummariesService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/material-process-summaries')
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'image', maxCount: 1 }],
      productionOrderMaterialProcessSummaryImageUploadOptions,
    ),
  )
  async createMaterialProcessSummary(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderMaterialProcessSummaryDto,
    @UploadedFiles()
    uploadedFiles: MaterialProcessSummaryUploadFields | undefined,
    @Request() req: any,
  ) {
    const uploadedImages =
      getUploadedMaterialProcessSummaryImages(uploadedFiles);

    try {
      return await this.productionOrderMaterialProcessSummariesService.create(
        id,
        createDto,
        req.user,
        { imagePath: getMaterialProcessSummaryImagePath(uploadedImages[0]) },
      );
    } catch (error) {
      await Promise.all(
        uploadedImages.map(removeUploadedMaterialProcessSummaryImage),
      );
      throw error;
    }
  }

  @Get(':id/leak-tightness-checks')
  async findLeakTightnessChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderLeakTightnessChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/leak-tightness-checks')
  async createLeakTightnessCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderLeakTightnessCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderLeakTightnessChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/hardness-checks')
  async findHardnessChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderHardnessChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/hardness-checks')
  async createHardnessCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderHardnessCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderHardnessChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/tablet-thickness-checks')
  async findTabletThicknessChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderTabletThicknessChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/tablet-thickness-checks')
  async createTabletThicknessCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderTabletThicknessCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderTabletThicknessChecksService.create(
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

  @Patch(':id/cylinder-calibration')
  async updateCylinderCalibration(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductionOrderCylinderCalibrationDto,
  ) {
    return this.productionOrderCylinderCalibrationsService.update(
      id,
      updateDto,
    );
  }

  @Delete(':id/cylinder-calibration')
  async deleteCylinderCalibration(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderCylinderCalibrationsService.delete(id);
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
      sensoryCheckImageUploadFields,
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

    if (uploadedImages.length > MAX_SENSORY_CHECK_IMAGE_COUNT) {
      await removeUploadedSensoryCheckImages(uploadedImages);
      throw new BadRequestException(
        `images cannot exceed ${MAX_SENSORY_CHECK_IMAGE_COUNT} files per sensory check`,
      );
    }

    try {
      return await this.productionOrderSensoryChecksService.create(
        id,
        createDto,
        req.user,
        {
          imagePaths: getSensoryCheckImagePaths(uploadedImages),
        },
      );
    } catch (error) {
      await removeUploadedSensoryCheckImages(uploadedImages);
      throw error;
    }
  }

  @Get(':id/steam-sterilization-checks')
  async findSteamSterilizationChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderSteamSterilizationChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/steam-sterilization-checks')
  @UseInterceptors(
    FileFieldsInterceptor(
      steamSterilizationCheckImageUploadFields,
      productionOrderSteamSterilizationCheckImageUploadOptions,
    ),
  )
  async createSteamSterilizationCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderSteamSterilizationCheckDto,
    @UploadedFiles()
    uploadedFiles: SteamSterilizationCheckUploadFields | undefined,
    @Request() req: any,
  ) {
    const uploadedImages =
      getUploadedSteamSterilizationCheckImages(uploadedFiles);

    try {
      return await this.productionOrderSteamSterilizationChecksService.create(
        id,
        createDto,
        req.user,
        getSteamSterilizationCheckUploadedImagePaths(uploadedFiles),
      );
    } catch (error) {
      await removeUploadedSteamSterilizationCheckImages(uploadedImages);
      throw error;
    }
  }

  @Get(':id/filtration-checks')
  async findFiltrationChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderFiltrationChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/filtration-checks')
  async createFiltrationCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderFiltrationCheckDto,
  ) {
    return this.productionOrderFiltrationChecksService.create(id, createDto);
  }

  @Get(':id/ten-unit-sensory-checks')
  async findTenUnitSensoryChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderTenUnitSensoryChecksService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/ten-unit-sensory-checks')
  async createTenUnitSensoryCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderTenUnitSensoryCheckDto,
    @Request() req: any,
  ) {
    return this.productionOrderTenUnitSensoryChecksService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Get(':id/date-checks')
  async findDateChecks(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderDateChecksService.findAllByProductionOrder(id);
  }

  @Get(':id/attachments')
  async findProductionOrderAttachments(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderAttachmentsService.findAllByProductionOrder(id);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_PRODUCTION_ORDER_ATTACHMENT_FILE_COUNT,
      productionOrderAttachmentUploadOptions,
    ),
  )
  async createProductionOrderAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderAttachmentDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Request() request: any,
  ) {
    try {
      return await this.productionOrderAttachmentsService.create(
        id,
        createDto,
        request.user,
        files ?? [],
      );
    } catch (error) {
      await removeUploadedProductionOrderAttachmentFiles(files);
      throw error;
    }
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

  @Get(':id/factory-release-reviews')
  async findFactoryReleaseReviews(@Param('id', ParseIntPipe) id: number) {
    return this.productionOrderFactoryReleaseReviewsService.findAllByProductionOrder(
      id,
    );
  }

  @Get(':id/primary-packaging-confirmations')
  async findPrimaryPackagingConfirmations(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productionOrderPrimaryPackagingConfirmationsService.findAllByProductionOrder(
      id,
    );
  }

  @Post(':id/primary-packaging-confirmations')
  async createPrimaryPackagingConfirmation(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderPrimaryPackagingConfirmationDto,
    @Request() req: any,
  ) {
    return this.productionOrderPrimaryPackagingConfirmationsService.create(
      id,
      createDto,
      req.user,
    );
  }

  @Post(':id/factory-release-reviews')
  async createFactoryReleaseReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateProductionOrderFactoryReleaseReviewDto,
  ) {
    return this.productionOrderFactoryReleaseReviewsService.create(
      id,
      createDto,
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
