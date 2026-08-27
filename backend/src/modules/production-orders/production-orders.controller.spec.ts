import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod, StreamableFile } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';
import type { Response } from 'express';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';
import { ProductionOrderSamplingRecordsService } from './production-order-sampling-records.service';
import { ProductionOrderDisinfectantPreparationsService } from './production-order-disinfectant-preparations.service';
import { ProductionOrderEnvironmentChecksService } from './production-order-environment-checks.service';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';
import { ProductionOrderFriabilityChecksService } from './production-order-friability-checks.service';
import { ProductionOrderSprayDoseChecksService } from './production-order-spray-dose-checks.service';
import { ProductionOrderPostHomogenizationGranuleChecksService } from './production-order-post-homogenization-granule-checks.service';
import { ProductionOrderPostPreparationSolutionChecksService } from './production-order-post-preparation-solution-checks.service';
import { ProductionOrderDisintegrationChecksService } from './production-order-disintegration-checks.service';
import { ProductionOrderHardCapsuleLeakageChecksService } from './production-order-hard-capsule-leakage-checks.service';
import { ProductionOrderVolumeChecksService } from './production-order-volume-checks.service';
import { ProductionOrderShellWeightChecksService } from './production-order-shell-weight-checks.service';
import { ProductionOrderTenShellWeightChecksService } from './production-order-ten-shell-weight-checks.service';
import { ProductionOrderVialInspectionChecksService } from './production-order-vial-inspection-checks.service';
import { ProductionOrderCylinderCalibrationsService } from './production-order-cylinder-calibrations.service';
import { ProductionOrderSensoryChecksService } from './production-order-sensory-checks.service';
import { ProductionOrderTenUnitSensoryChecksService } from './production-order-ten-unit-sensory-checks.service';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';
import { ProductionOrderSteamSterilizationChecksService } from './production-order-steam-sterilization-checks.service';
import { ProductionOrderFiltrationChecksService } from './production-order-filtration-checks.service';
import { ProductionOrderSemiFinishedGrossWeightChecksService } from './production-order-semi-finished-gross-weight-checks.service';
import { ProductionOrderSemiFinishedNetWeightChecksService } from './production-order-semi-finished-net-weight-checks.service';
import { ProductionOrderSemiFinishedProductSummariesService } from './production-order-semi-finished-product-summaries.service';
import { ProductionOrderMaterialSummariesService } from './production-order-material-summaries.service';
import { ProductionOrderMaterialProcessSummariesService } from './production-order-material-process-summaries.service';
import { ProductionOrderLeakTightnessChecksService } from './production-order-leak-tightness-checks.service';
import { ProductionOrderHardnessChecksService } from './production-order-hardness-checks.service';
import { ProductionOrderTabletThicknessChecksService } from './production-order-tablet-thickness-checks.service';
import { ProductionOrderFactoryReleaseReviewsService } from './production-order-factory-release-reviews.service';
import { ProductionOrderHygieneChecksService } from './production-order-hygiene-checks.service';
import { ProductionOrderLineClearanceChecksService } from './production-order-line-clearance-checks.service';
import { ProductionOrderSecondaryPackagingChecksService } from './production-order-secondary-packaging-checks.service';
import { ProductionOrderPreSecondaryPackagingChecksService } from './production-order-pre-secondary-packaging-checks.service';
import { ProductionOrderPostSecondaryPackagingSummariesService } from './production-order-post-secondary-packaging-summaries.service';
import { ProductionOrderDocumentControlsService } from './production-order-document-controls.service';
import { ProductionOrderPrimaryPackagingConfirmationsService } from './production-order-primary-packaging-confirmations.service';
import { ProductionOrderProductionGuidesService } from './production-order-production-guides.service';
import { ProductionOrderAttachmentsService } from './production-order-attachments.service';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';

describe('ProductionOrdersController', () => {
  let controller: ProductionOrdersController;
  let productionOrdersService: {
    findAll: jest.Mock;
    findFinishedProducts: jest.Mock;
    findSemiFinishedProducts: jest.Mock;
    findProductionOrderById: jest.Mock;
    findProductionOrderLines: jest.Mock;
    exportProductionOrder: jest.Mock;
    exportProductionOrderLines: jest.Mock;
    exportWeighingTicket: jest.Mock;
    exportPostWeighingMaterialCheck: jest.Mock;
  };
  let productionOrderSamplingRequestsService: {
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderSamplingRecordsService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderDisinfectantPreparationsService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderEnvironmentChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderHygieneChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderLineClearanceChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderSecondaryPackagingChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderPreSecondaryPackagingChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    addImages: jest.Mock;
    deleteImage: jest.Mock;
    findImageFile: jest.Mock;
  };
  let productionOrderFinishedProductSummariesService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderDensityChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderFriabilityChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderSprayDoseChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderPostHomogenizationGranuleChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findImageFile: jest.Mock;
  };
  let productionOrderPostPreparationSolutionChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findImageFile: jest.Mock;
  };
  let productionOrderDisintegrationChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderHardCapsuleLeakageChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderVolumeChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderShellWeightChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderTenShellWeightChecksService: {
    findById: jest.Mock;
    findByProductionOrder: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderVialInspectionChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderCylinderCalibrationsService: {
    findByProductionOrder: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderSensoryChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    addImages: jest.Mock;
    deleteImage: jest.Mock;
    findImageFile: jest.Mock;
  };
  let productionOrderTenUnitSensoryChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderDateChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    approve: jest.Mock;
    delete: jest.Mock;
    addImages: jest.Mock;
    deleteImage: jest.Mock;
    findImageFile: jest.Mock;
    findRequestFile: jest.Mock;
  };
  let productionOrderFiltrationChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderSteamSterilizationChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findImageFile: jest.Mock;
  };
  let productionOrderSemiFinishedGrossWeightChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderSemiFinishedNetWeightChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderSemiFinishedProductSummariesService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderPostSecondaryPackagingSummariesService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findPendingProcessItems: jest.Mock;
    createPendingProcessItem: jest.Mock;
    findPendingProcessItemById: jest.Mock;
    updatePendingProcessItem: jest.Mock;
    deletePendingProcessItem: jest.Mock;
    findPendingCancellationItems: jest.Mock;
    createPendingCancellationItem: jest.Mock;
    findPendingCancellationItemById: jest.Mock;
    updatePendingCancellationItem: jest.Mock;
    deletePendingCancellationItem: jest.Mock;
  };
  let productionOrderMaterialSummariesService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderMaterialProcessSummariesService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findImageFile: jest.Mock;
  };
  let productionOrderLeakTightnessChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderHardnessChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderTabletThicknessChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderFactoryReleaseReviewsService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderDocumentControlsService: {
    findByProductionOrder: jest.Mock;
    issueBatchRecord: jest.Mock;
    receiveBatchRecord: jest.Mock;
    receiveTestCertificate: jest.Mock;
    receiveWarehouseRelease: jest.Mock;
  };
  let productionOrderPrimaryPackagingConfirmationsService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderProductionGuidesService: {
    findByProductionOrder: jest.Mock;
    getFile: jest.Mock;
    upload: jest.Mock;
    delete: jest.Mock;
  };
  let productionOrderAttachmentsService: {
    findFile: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    approve: jest.Mock;
    addFiles: jest.Mock;
    deleteFile: jest.Mock;
    delete: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    productionOrdersService = {
      findAll: jest.fn(),
      findFinishedProducts: jest.fn(),
      findSemiFinishedProducts: jest.fn(),
      findProductionOrderById: jest.fn(),
      findProductionOrderLines: jest.fn(),
      exportProductionOrder: jest.fn(),
      exportProductionOrderLines: jest.fn(),
      exportWeighingTicket: jest.fn(),
      exportPostWeighingMaterialCheck: jest.fn(),
    };
    productionOrderSamplingRequestsService = {
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderSamplingRecordsService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderDisinfectantPreparationsService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderEnvironmentChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderHygieneChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderLineClearanceChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderSecondaryPackagingChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderPreSecondaryPackagingChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addImages: jest.fn(),
      deleteImage: jest.fn(),
      findImageFile: jest.fn(),
    };
    productionOrderFinishedProductSummariesService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderDensityChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderFriabilityChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderSprayDoseChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderPostHomogenizationGranuleChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findImageFile: jest.fn(),
    };
    productionOrderPostPreparationSolutionChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findImageFile: jest.fn(),
    };
    productionOrderDisintegrationChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderHardCapsuleLeakageChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderVolumeChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderShellWeightChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderTenShellWeightChecksService = {
      findById: jest.fn(),
      findByProductionOrder: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderVialInspectionChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderCylinderCalibrationsService = {
      findByProductionOrder: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderSensoryChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addImages: jest.fn(),
      deleteImage: jest.fn(),
      findImageFile: jest.fn(),
    };
    productionOrderTenUnitSensoryChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderDateChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      delete: jest.fn(),
      addImages: jest.fn(),
      deleteImage: jest.fn(),
      findImageFile: jest.fn(),
      findRequestFile: jest.fn(),
    };
    productionOrderFiltrationChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderSteamSterilizationChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findImageFile: jest.fn(),
    };
    productionOrderSemiFinishedGrossWeightChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderSemiFinishedNetWeightChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderSemiFinishedProductSummariesService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderPostSecondaryPackagingSummariesService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findPendingProcessItems: jest.fn(),
      createPendingProcessItem: jest.fn(),
      findPendingProcessItemById: jest.fn(),
      updatePendingProcessItem: jest.fn(),
      deletePendingProcessItem: jest.fn(),
      findPendingCancellationItems: jest.fn(),
      createPendingCancellationItem: jest.fn(),
      findPendingCancellationItemById: jest.fn(),
      updatePendingCancellationItem: jest.fn(),
      deletePendingCancellationItem: jest.fn(),
    };
    productionOrderMaterialSummariesService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderMaterialProcessSummariesService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findImageFile: jest.fn(),
    };
    productionOrderLeakTightnessChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderHardnessChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderTabletThicknessChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderFactoryReleaseReviewsService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderDocumentControlsService = {
      findByProductionOrder: jest.fn(),
      issueBatchRecord: jest.fn(),
      receiveBatchRecord: jest.fn(),
      receiveTestCertificate: jest.fn(),
      receiveWarehouseRelease: jest.fn(),
    };
    productionOrderPrimaryPackagingConfirmationsService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderProductionGuidesService = {
      findByProductionOrder: jest.fn(),
      getFile: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
    };
    productionOrderAttachmentsService = {
      findFile: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      addFiles: jest.fn(),
      deleteFile: jest.fn(),
      delete: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [
        {
          provide: ProductionOrdersService,
          useValue: productionOrdersService,
        },
        {
          provide: ProductionOrderSamplingRequestsService,
          useValue: productionOrderSamplingRequestsService,
        },
        {
          provide: ProductionOrderSamplingRecordsService,
          useValue: productionOrderSamplingRecordsService,
        },
        {
          provide: ProductionOrderDisinfectantPreparationsService,
          useValue: productionOrderDisinfectantPreparationsService,
        },
        {
          provide: ProductionOrderEnvironmentChecksService,
          useValue: productionOrderEnvironmentChecksService,
        },
        {
          provide: ProductionOrderHygieneChecksService,
          useValue: productionOrderHygieneChecksService,
        },
        {
          provide: ProductionOrderLineClearanceChecksService,
          useValue: productionOrderLineClearanceChecksService,
        },
        {
          provide: ProductionOrderSecondaryPackagingChecksService,
          useValue: productionOrderSecondaryPackagingChecksService,
        },
        {
          provide: ProductionOrderPreSecondaryPackagingChecksService,
          useValue: productionOrderPreSecondaryPackagingChecksService,
        },
        {
          provide: ProductionOrderFinishedProductSummariesService,
          useValue: productionOrderFinishedProductSummariesService,
        },
        {
          provide: ProductionOrderDensityChecksService,
          useValue: productionOrderDensityChecksService,
        },
        {
          provide: ProductionOrderFriabilityChecksService,
          useValue: productionOrderFriabilityChecksService,
        },
        {
          provide: ProductionOrderSprayDoseChecksService,
          useValue: productionOrderSprayDoseChecksService,
        },
        {
          provide: ProductionOrderPostHomogenizationGranuleChecksService,
          useValue: productionOrderPostHomogenizationGranuleChecksService,
        },
        {
          provide: ProductionOrderPostPreparationSolutionChecksService,
          useValue: productionOrderPostPreparationSolutionChecksService,
        },
        {
          provide: ProductionOrderDisintegrationChecksService,
          useValue: productionOrderDisintegrationChecksService,
        },
        {
          provide: ProductionOrderHardCapsuleLeakageChecksService,
          useValue: productionOrderHardCapsuleLeakageChecksService,
        },
        {
          provide: ProductionOrderVolumeChecksService,
          useValue: productionOrderVolumeChecksService,
        },
        {
          provide: ProductionOrderShellWeightChecksService,
          useValue: productionOrderShellWeightChecksService,
        },
        {
          provide: ProductionOrderTenShellWeightChecksService,
          useValue: productionOrderTenShellWeightChecksService,
        },
        {
          provide: ProductionOrderVialInspectionChecksService,
          useValue: productionOrderVialInspectionChecksService,
        },
        {
          provide: ProductionOrderCylinderCalibrationsService,
          useValue: productionOrderCylinderCalibrationsService,
        },
        {
          provide: ProductionOrderSensoryChecksService,
          useValue: productionOrderSensoryChecksService,
        },
        {
          provide: ProductionOrderTenUnitSensoryChecksService,
          useValue: productionOrderTenUnitSensoryChecksService,
        },
        {
          provide: ProductionOrderDateChecksService,
          useValue: productionOrderDateChecksService,
        },
        {
          provide: ProductionOrderSteamSterilizationChecksService,
          useValue: productionOrderSteamSterilizationChecksService,
        },
        {
          provide: ProductionOrderFiltrationChecksService,
          useValue: productionOrderFiltrationChecksService,
        },
        {
          provide: ProductionOrderSemiFinishedGrossWeightChecksService,
          useValue: productionOrderSemiFinishedGrossWeightChecksService,
        },
        {
          provide: ProductionOrderSemiFinishedNetWeightChecksService,
          useValue: productionOrderSemiFinishedNetWeightChecksService,
        },
        {
          provide: ProductionOrderSemiFinishedProductSummariesService,
          useValue: productionOrderSemiFinishedProductSummariesService,
        },
        {
          provide: ProductionOrderPostSecondaryPackagingSummariesService,
          useValue: productionOrderPostSecondaryPackagingSummariesService,
        },
        {
          provide: ProductionOrderMaterialSummariesService,
          useValue: productionOrderMaterialSummariesService,
        },
        {
          provide: ProductionOrderMaterialProcessSummariesService,
          useValue: productionOrderMaterialProcessSummariesService,
        },
        {
          provide: ProductionOrderLeakTightnessChecksService,
          useValue: productionOrderLeakTightnessChecksService,
        },
        {
          provide: ProductionOrderHardnessChecksService,
          useValue: productionOrderHardnessChecksService,
        },
        {
          provide: ProductionOrderTabletThicknessChecksService,
          useValue: productionOrderTabletThicknessChecksService,
        },
        {
          provide: ProductionOrderFactoryReleaseReviewsService,
          useValue: productionOrderFactoryReleaseReviewsService,
        },
        {
          provide: ProductionOrderDocumentControlsService,
          useValue: productionOrderDocumentControlsService,
        },
        {
          provide: ProductionOrderPrimaryPackagingConfirmationsService,
          useValue: productionOrderPrimaryPackagingConfirmationsService,
        },
        {
          provide: ProductionOrderProductionGuidesService,
          useValue: productionOrderProductionGuidesService,
        },
        {
          provide: ProductionOrderAttachmentsService,
          useValue: productionOrderAttachmentsService,
        },
      ],
    }).compile();

    controller = module.get<ProductionOrdersController>(
      ProductionOrdersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('declares permission keys for every production-order route', () => {
    const prototype = ProductionOrdersController.prototype;
    const routeNames = Object.getOwnPropertyNames(prototype).filter(
      (name) =>
        name !== 'constructor' &&
        Reflect.hasMetadata(
          METHOD_METADATA,
          prototype[name as keyof ProductionOrdersController],
        ),
    );
    const listRoutes = new Set([
      'findAll',
      'findFinishedProducts',
      'findSemiFinishedProducts',
      'findAllFinishedProductSummaries',
    ]);
    const readPostRoutes = new Set([
      'exportProductionOrderLines',
      'exportWeighingTicket',
      'exportPostWeighingMaterialCheck',
    ]);

    expect(routeNames.length).toBeGreaterThan(0);

    routeNames.forEach((name) => {
      const handler = prototype[name as keyof ProductionOrdersController];
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler);
      const expectedPermission =
        requestMethod === RequestMethod.GET
          ? listRoutes.has(name)
            ? PRODUCTION_ORDER_PERMISSIONS.LIST
            : PRODUCTION_ORDER_PERMISSIONS.READ
          : requestMethod === RequestMethod.POST
            ? readPostRoutes.has(name)
              ? PRODUCTION_ORDER_PERMISSIONS.READ
              : PRODUCTION_ORDER_PERMISSIONS.CREATE
            : requestMethod === RequestMethod.PATCH ||
                requestMethod === RequestMethod.PUT
              ? PRODUCTION_ORDER_PERMISSIONS.UPDATE
              : PRODUCTION_ORDER_PERMISSIONS.DELETE;

      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        expectedPermission,
      ]);
    });
  });

  it('gets production orders with TP item codes', async () => {
    const productionOrders = [{ id: 2031, item_code: 'TP00001' }];
    productionOrdersService.findFinishedProducts.mockResolvedValue(
      productionOrders,
    );

    await expect(controller.findFinishedProducts()).resolves.toBe(
      productionOrders,
    );
    expect(productionOrdersService.findFinishedProducts).toHaveBeenCalledTimes(
      1,
    );
  });

  it('gets production orders with BTP item codes', async () => {
    const productionOrders = [{ id: 2031, item_code: 'BTP00001' }];
    productionOrdersService.findSemiFinishedProducts.mockResolvedValue(
      productionOrders,
    );

    await expect(controller.findSemiFinishedProducts()).resolves.toBe(
      productionOrders,
    );
    expect(
      productionOrdersService.findSemiFinishedProducts,
    ).toHaveBeenCalledTimes(1);
  });

  it('gets a production order by id', async () => {
    const productionOrder = {
      id: 2031,
      item_code: 'TP00001',
      pyclm: {
        isSent: true,
      },
    };
    productionOrdersService.findProductionOrderById.mockResolvedValue(
      productionOrder,
    );

    await expect(controller.findProductionOrderById(2031)).resolves.toBe(
      productionOrder,
    );
    expect(
      productionOrdersService.findProductionOrderById,
    ).toHaveBeenCalledWith(2031);
  });

  it('sets download headers and returns a streamable file when exporting a production order', async () => {
    const buffer = Buffer.from('docx-content');
    productionOrdersService.exportProductionOrder.mockResolvedValue({
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'Lenh san xuat EUCIGA 5 ml 0030126.docx',
    });
    const response = {
      set: jest.fn(),
    } as unknown as Response;

    const result = await controller.exportProductionOrder(2031, response);

    expect(productionOrdersService.exportProductionOrder).toHaveBeenCalledWith(
      2031,
    );
    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="Lenh san xuat EUCIGA 5 ml 0030126.docx"; filename*=UTF-8\'\'Lenh%20san%20xuat%20EUCIGA%205%20ml%200030126.docx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('gets sampling requests for a production order', async () => {
    const samplingRequests = [{ id: 1, production_order_id: 2031 }];
    productionOrderSamplingRequestsService.findAllByProductionOrder.mockResolvedValue(
      samplingRequests,
    );

    await expect(controller.findSamplingRequests(2031)).resolves.toBe(
      samplingRequests,
    );
    expect(
      productionOrderSamplingRequestsService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('creates a sampling request using the authenticated user', async () => {
    const createDto = { location: 'Kiem nghiem' };
    const user = { id: 7, name: 'Binh' };
    const result = { status: 'success', samplingRequest: { id: 1 } };
    productionOrderSamplingRequestsService.create.mockResolvedValue(result);

    await expect(
      controller.createSamplingRequest(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderSamplingRequestsService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('gets sampling records for a production order', async () => {
    const samplingRecords = [{ id: 1, production_order_id: 2031 }];
    productionOrderSamplingRecordsService.findAllByProductionOrder.mockResolvedValue(
      samplingRecords,
    );

    await expect(controller.findSamplingRecords(2031)).resolves.toBe(
      samplingRecords,
    );
    expect(
      productionOrderSamplingRecordsService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a sampling record by id', async () => {
    const samplingRecord = { id: 1, production_order_id: 2031 };
    productionOrderSamplingRecordsService.findById.mockResolvedValue(
      samplingRecord,
    );

    await expect(controller.findSamplingRecordById(1)).resolves.toBe(
      samplingRecord,
    );
    expect(productionOrderSamplingRecordsService.findById).toHaveBeenCalledWith(
      1,
    );
  });

  it('creates a sampling record using the authenticated user', async () => {
    const createDto = {
      sampling_type: 'Dinh ky',
      quantity: 12.5,
      unit: 'mau',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSamplingRecordsService.create.mockResolvedValue(result);

    await expect(
      controller.createSamplingRecord(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderSamplingRecordsService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('updates a sampling record', async () => {
    const updateDto = {
      sampling_type: 'Dot xuat',
      quantity: 10,
    };
    const result = { id: 1, sampling_type: 'Dot xuat' };
    productionOrderSamplingRecordsService.update.mockResolvedValue(result);

    await expect(controller.updateSamplingRecord(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderSamplingRecordsService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('deletes a sampling record', async () => {
    const result = { id: 1 };
    productionOrderSamplingRecordsService.delete.mockResolvedValue(result);

    await expect(controller.deleteSamplingRecord(1)).resolves.toBe(result);
    expect(productionOrderSamplingRecordsService.delete).toHaveBeenCalledWith(
      1,
    );
  });

  it('gets disinfectant preparations for a production order', async () => {
    const preparations = [{ id: 1, production_order_id: 2031 }];
    productionOrderDisinfectantPreparationsService.findAllByProductionOrder.mockResolvedValue(
      preparations,
    );

    await expect(controller.findDisinfectantPreparations(2031)).resolves.toBe(
      preparations,
    );
    expect(
      productionOrderDisinfectantPreparationsService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a disinfectant preparation by id', async () => {
    const preparation = { id: 1, production_order_id: 2031 };
    productionOrderDisinfectantPreparationsService.findById.mockResolvedValue(
      preparation,
    );

    await expect(controller.findDisinfectantPreparationById(1)).resolves.toBe(
      preparation,
    );
    expect(
      productionOrderDisinfectantPreparationsService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a disinfectant preparation using the authenticated user', async () => {
    const createDto = {
      workshop_id: 2,
      disinfectant_name: 'Con 70',
      purpose: 'Sat khuan dung cu',
      base_material_name: 'Con 96',
      base_material_content: 96,
      base_material_amount_l: 7.3,
      prepared_volume_l: 10,
      actual_concentration: 70,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderDisinfectantPreparationsService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createDisinfectantPreparation(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderDisinfectantPreparationsService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a disinfectant preparation', async () => {
    const updateDto = {
      actual_concentration: 71,
    };
    const result = { id: 1, actual_concentration: '71.0000' };
    productionOrderDisinfectantPreparationsService.update.mockResolvedValue(
      result,
    );

    await expect(
      controller.updateDisinfectantPreparation(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderDisinfectantPreparationsService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a disinfectant preparation', async () => {
    const result = { id: 1 };
    productionOrderDisinfectantPreparationsService.delete.mockResolvedValue(
      result,
    );

    await expect(controller.deleteDisinfectantPreparation(1)).resolves.toBe(
      result,
    );
    expect(
      productionOrderDisinfectantPreparationsService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets environment checks for a production order', async () => {
    const environmentChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderEnvironmentChecksService.findAllByProductionOrder.mockResolvedValue(
      environmentChecks,
    );

    await expect(controller.findEnvironmentChecks(2031)).resolves.toBe(
      environmentChecks,
    );
    expect(
      productionOrderEnvironmentChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets an environment check by id', async () => {
    const environmentCheck = { id: 1, production_order_id: 2031 };
    productionOrderEnvironmentChecksService.findById.mockResolvedValue(
      environmentCheck,
    );

    await expect(controller.findEnvironmentCheckById(1)).resolves.toBe(
      environmentCheck,
    );
    expect(
      productionOrderEnvironmentChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates an environment check using the authenticated user', async () => {
    const createDto = {
      room: 'Phong pha che 1',
      temperature_c: 25.5,
      humidity_percent: 60.2,
      checked_at: '2026-06-11T08:00:00.000Z',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderEnvironmentChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createEnvironmentCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderEnvironmentChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('updates an environment check', async () => {
    const updateDto = {
      room: 'Phong dong goi 1',
      humidity_percent: 58.5,
    };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderEnvironmentChecksService.update.mockResolvedValue(result);

    await expect(controller.updateEnvironmentCheck(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderEnvironmentChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('deletes an environment check', async () => {
    const result = { id: 1, production_order_id: 2031 };
    productionOrderEnvironmentChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteEnvironmentCheck(1)).resolves.toBe(result);
    expect(productionOrderEnvironmentChecksService.delete).toHaveBeenCalledWith(
      1,
    );
  });

  it('gets line clearance checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderLineClearanceChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findLineClearanceChecks(2031)).resolves.toBe(
      checks,
    );
    expect(
      productionOrderLineClearanceChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a line clearance check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderLineClearanceChecksService.findById.mockResolvedValue(check);

    await expect(controller.findLineClearanceCheckById(1)).resolves.toBe(check);
    expect(
      productionOrderLineClearanceChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a line clearance check using the authenticated user', async () => {
    const createDto = {
      check_type: 'Kiểm tra thiết bị',
      requirement: 'Không còn vật tư lô trước',
      result: 'Đạt',
      previous_lot_no: 'LO-TRUOC-01',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderLineClearanceChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createLineClearanceCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderLineClearanceChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a line clearance check', async () => {
    const updateDto = { result: 'Không đạt' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderLineClearanceChecksService.update.mockResolvedValue(result);

    await expect(
      controller.updateLineClearanceCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderLineClearanceChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a line clearance check', async () => {
    const result = { id: 1, production_order_id: 2031 };
    productionOrderLineClearanceChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteLineClearanceCheck(1)).resolves.toBe(result);
    expect(
      productionOrderLineClearanceChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets secondary packaging checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderSecondaryPackagingChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findSecondaryPackagingChecks(2031)).resolves.toBe(
      checks,
    );
    expect(
      productionOrderSecondaryPackagingChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a secondary packaging check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderSecondaryPackagingChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(controller.findSecondaryPackagingCheckById(1)).resolves.toBe(
      check,
    );
    expect(
      productionOrderSecondaryPackagingChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a secondary packaging check using the authenticated user', async () => {
    const createDto = {
      stage: 'Đóng hộp',
      requirement: 'Nhãn đúng quy định',
      quantity_checked: 100,
      quantity_passed: 98,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSecondaryPackagingChecksService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createSecondaryPackagingCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderSecondaryPackagingChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a secondary packaging check', async () => {
    const updateDto = { quantity_passed: 100 };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSecondaryPackagingChecksService.update.mockResolvedValue(
      result,
    );

    await expect(
      controller.updateSecondaryPackagingCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderSecondaryPackagingChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a secondary packaging check', async () => {
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSecondaryPackagingChecksService.delete.mockResolvedValue(
      result,
    );

    await expect(controller.deleteSecondaryPackagingCheck(1)).resolves.toBe(
      result,
    );
    expect(
      productionOrderSecondaryPackagingChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets density checks for a production order', async () => {
    const densityChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderDensityChecksService.findAllByProductionOrder.mockResolvedValue(
      densityChecks,
    );

    await expect(controller.findDensityChecks(2031)).resolves.toBe(
      densityChecks,
    );
    expect(
      productionOrderDensityChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a density check by id', async () => {
    const densityCheck = { id: 1, production_order_id: 2031 };
    productionOrderDensityChecksService.findById.mockResolvedValue(
      densityCheck,
    );

    await expect(controller.findDensityCheckById(1)).resolves.toBe(
      densityCheck,
    );
    expect(productionOrderDensityChecksService.findById).toHaveBeenCalledWith(
      1,
    );
  });

  it('creates a density check using the authenticated user', async () => {
    const createDto = {
      empty_pycnometer_mass_g: 25,
      solution_pycnometer_mass_g: 75,
      water_pycnometer_mass_g: 75.5,
      apparent_density: 0.65,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderDensityChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createDensityCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderDensityChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('updates a density check', async () => {
    const updateDto = {
      solution_pycnometer_mass_g: 76,
      apparent_density: 0.7,
    };
    const result = { id: 1, solution_pycnometer_mass_g: 76 };
    productionOrderDensityChecksService.update.mockResolvedValue(result);

    await expect(controller.updateDensityCheck(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderDensityChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('deletes a density check', async () => {
    const result = { id: 1 };
    productionOrderDensityChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteDensityCheck(1)).resolves.toBe(result);
    expect(productionOrderDensityChecksService.delete).toHaveBeenCalledWith(1);
  });

  it('gets friability checks for a production order', async () => {
    const friabilityChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderFriabilityChecksService.findAllByProductionOrder.mockResolvedValue(
      friabilityChecks,
    );

    await expect(controller.findFriabilityChecks(2031)).resolves.toBe(
      friabilityChecks,
    );
    expect(
      productionOrderFriabilityChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a friability check by id', async () => {
    const friabilityCheck = { id: 1, production_order_id: 2031 };
    productionOrderFriabilityChecksService.findById.mockResolvedValue(
      friabilityCheck,
    );

    await expect(controller.findFriabilityCheckById(1)).resolves.toBe(
      friabilityCheck,
    );
    expect(
      productionOrderFriabilityChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a friability check using the authenticated user', async () => {
    const createDto = {
      total_weight_before_check: 1000,
      total_weight_after_check: 990,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderFriabilityChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createFriabilityCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderFriabilityChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('updates a friability check', async () => {
    const updateDto = {
      total_weight_after_check: 980,
    };
    const result = { id: 1, total_weight_after_check: 980 };
    productionOrderFriabilityChecksService.update.mockResolvedValue(result);

    await expect(controller.updateFriabilityCheck(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderFriabilityChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('deletes a friability check', async () => {
    const result = { id: 1 };
    productionOrderFriabilityChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteFriabilityCheck(1)).resolves.toBe(result);
    expect(productionOrderFriabilityChecksService.delete).toHaveBeenCalledWith(
      1,
    );
  });

  it('gets spray dose checks for a production order', async () => {
    const sprayDoseChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderSprayDoseChecksService.findAllByProductionOrder.mockResolvedValue(
      sprayDoseChecks,
    );

    await expect(controller.findSprayDoseChecks(2031)).resolves.toBe(
      sprayDoseChecks,
    );
    expect(
      productionOrderSprayDoseChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a spray dose check by id', async () => {
    const sprayDoseCheck = { id: 1, production_order_id: 2031 };
    productionOrderSprayDoseChecksService.findById.mockResolvedValue(
      sprayDoseCheck,
    );

    await expect(controller.findSprayDoseCheckById(1)).resolves.toBe(
      sprayDoseCheck,
    );
    expect(productionOrderSprayDoseChecksService.findById).toHaveBeenCalledWith(
      1,
    );
  });

  it('creates a spray dose check using the authenticated user', async () => {
    const createDto = {
      requirement: '90 - 110 dose',
      bottle_1_spray_dose_count: 120,
      bottle_2_spray_dose_count: 121,
      bottle_3_spray_dose_count: 122,
      bottle_4_spray_dose_count: 123,
      bottle_5_spray_dose_count: 124,
      bottle_6_spray_dose_count: 125,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSprayDoseChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createSprayDoseCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderSprayDoseChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('updates a spray dose check', async () => {
    const updateDto = {
      requirement: '95 - 105 dose',
      bottle_2_spray_dose_count: null,
    };
    const result = { id: 1, requirement: '95 - 105 dose' };
    productionOrderSprayDoseChecksService.update.mockResolvedValue(result);

    await expect(controller.updateSprayDoseCheck(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderSprayDoseChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('deletes a spray dose check', async () => {
    const result = { id: 1 };
    productionOrderSprayDoseChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteSprayDoseCheck(1)).resolves.toBe(result);
    expect(productionOrderSprayDoseChecksService.delete).toHaveBeenCalledWith(
      1,
    );
  });

  it('gets post-homogenization granule checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderPostHomogenizationGranuleChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(
      controller.findPostHomogenizationGranuleChecks(2031),
    ).resolves.toBe(checks);
    expect(
      productionOrderPostHomogenizationGranuleChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a post-homogenization granule check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderPostHomogenizationGranuleChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(
      controller.findPostHomogenizationGranuleCheckById(1),
    ).resolves.toBe(check);
    expect(
      productionOrderPostHomogenizationGranuleChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a post-homogenization granule check using the authenticated user', async () => {
    const createDto = {
      bulk_density: 0.52,
      tapped_density: 0.68,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderPostHomogenizationGranuleChecksService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createPostHomogenizationGranuleCheck(
        2031,
        createDto,
        undefined,
        { user },
      ),
    ).resolves.toBe(result);
    expect(
      productionOrderPostHomogenizationGranuleChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user, {
      imagePath: undefined,
    });
  });

  it('updates a post-homogenization granule check', async () => {
    const updateDto = {
      tapped_density: 0.7,
    };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderPostHomogenizationGranuleChecksService.update.mockResolvedValue(
      result,
    );

    await expect(
      controller.updatePostHomogenizationGranuleCheck(1, updateDto, undefined),
    ).resolves.toBe(result);
    expect(
      productionOrderPostHomogenizationGranuleChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto, {
      imagePath: undefined,
    });
  });

  it('deletes a post-homogenization granule check', async () => {
    const result = { id: 1 };
    productionOrderPostHomogenizationGranuleChecksService.delete.mockResolvedValue(
      result,
    );

    await expect(
      controller.deletePostHomogenizationGranuleCheck(1),
    ).resolves.toBe(result);
    expect(
      productionOrderPostHomogenizationGranuleChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets disintegration checks for a production order', async () => {
    const disintegrationChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderDisintegrationChecksService.findAllByProductionOrder.mockResolvedValue(
      disintegrationChecks,
    );

    await expect(controller.findDisintegrationChecks(2031)).resolves.toBe(
      disintegrationChecks,
    );
    expect(
      productionOrderDisintegrationChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a disintegration check by id', async () => {
    const disintegrationCheck = { id: 1, production_order_id: 2031 };
    productionOrderDisintegrationChecksService.findById.mockResolvedValue(
      disintegrationCheck,
    );

    await expect(controller.findDisintegrationCheckById(1)).resolves.toBe(
      disintegrationCheck,
    );
    expect(
      productionOrderDisintegrationChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a disintegration check using the authenticated user', async () => {
    const createDto = {
      dosage_form_stage: 'tablet',
      unit_1_passed: true,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderDisintegrationChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createDisintegrationCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderDisintegrationChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a disintegration check', async () => {
    const updateDto = { unit_6_passed: null };
    const result = { id: 1, unit_6_passed: null };
    productionOrderDisintegrationChecksService.update.mockResolvedValue(result);

    await expect(
      controller.updateDisintegrationCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderDisintegrationChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a disintegration check', async () => {
    const result = { id: 1 };
    productionOrderDisintegrationChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteDisintegrationCheck(1)).resolves.toBe(result);
    expect(
      productionOrderDisintegrationChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets hard capsule leakage checks for a production order', async () => {
    const leakageChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderHardCapsuleLeakageChecksService.findAllByProductionOrder.mockResolvedValue(
      leakageChecks,
    );

    await expect(controller.findHardCapsuleLeakageChecks(2031)).resolves.toBe(
      leakageChecks,
    );
    expect(
      productionOrderHardCapsuleLeakageChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a hard capsule leakage check by id', async () => {
    const leakageCheck = { id: 1, production_order_id: 2031 };
    productionOrderHardCapsuleLeakageChecksService.findById.mockResolvedValue(
      leakageCheck,
    );

    await expect(controller.findHardCapsuleLeakageCheckById(1)).resolves.toBe(
      leakageCheck,
    );
    expect(
      productionOrderHardCapsuleLeakageChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a hard capsule leakage check using the authenticated user', async () => {
    const createDto = {
      stage: 'before_coating',
      tested_capsule_count: 100,
      leaked_capsule_count: 2,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderHardCapsuleLeakageChecksService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createHardCapsuleLeakageCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderHardCapsuleLeakageChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a hard capsule leakage check', async () => {
    const updateDto = {
      leaked_capsule_count: 1,
    };
    const result = { id: 1, leaked_capsule_count: 1 };
    productionOrderHardCapsuleLeakageChecksService.update.mockResolvedValue(
      result,
    );

    await expect(
      controller.updateHardCapsuleLeakageCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderHardCapsuleLeakageChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a hard capsule leakage check', async () => {
    const result = { id: 1 };
    productionOrderHardCapsuleLeakageChecksService.delete.mockResolvedValue(
      result,
    );

    await expect(controller.deleteHardCapsuleLeakageCheck(1)).resolves.toBe(
      result,
    );
    expect(
      productionOrderHardCapsuleLeakageChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets volume checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderVolumeChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findVolumeChecks(2031)).resolves.toBe(checks);
    expect(
      productionOrderVolumeChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a volume check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderVolumeChecksService.findById.mockResolvedValue(check);

    await expect(controller.findVolumeCheckById(1)).resolves.toBe(check);
    expect(productionOrderVolumeChecksService.findById).toHaveBeenCalledWith(1);
  });

  it('creates a volume check using the authenticated user', async () => {
    const createDto = {
      package_type: 'lo',
      unit_1_volume: 10.01,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderVolumeChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createVolumeCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderVolumeChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('updates a volume check', async () => {
    const updateDto = {
      package_type: 'goi',
      unit_2_volume: null,
    };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderVolumeChecksService.update.mockResolvedValue(result);

    await expect(controller.updateVolumeCheck(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderVolumeChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('deletes a volume check', async () => {
    const result = { id: 1, production_order_id: 2031 };
    productionOrderVolumeChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteVolumeCheck(1)).resolves.toBe(result);
    expect(productionOrderVolumeChecksService.delete).toHaveBeenCalledWith(1);
  });

  it('gets shell weight checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderShellWeightChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findShellWeightChecks(2031)).resolves.toBe(checks);
    expect(
      productionOrderShellWeightChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a shell weight check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderShellWeightChecksService.findById.mockResolvedValue(check);

    await expect(controller.findShellWeightCheckById(1)).resolves.toBe(check);
    expect(
      productionOrderShellWeightChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a shell weight check using the authenticated user', async () => {
    const createDto = {
      shell_1_weight: 50.01,
      shell_2_weight: 50.02,
      shell_3_weight: 49.98,
      shell_4_weight: 50,
      shell_5_weight: 50.03,
      shell_6_weight: 49.99,
      shell_7_weight: 50.04,
      shell_8_weight: 49.97,
      shell_9_weight: 50.05,
      shell_10_weight: 49.96,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderShellWeightChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createShellWeightCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderShellWeightChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('updates a shell weight check', async () => {
    const updateDto = { shell_3_weight: 51.25 };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderShellWeightChecksService.update.mockResolvedValue(result);

    await expect(controller.updateShellWeightCheck(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderShellWeightChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('deletes a shell weight check', async () => {
    const result = { id: 1, production_order_id: 2031 };
    productionOrderShellWeightChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteShellWeightCheck(1)).resolves.toBe(result);
    expect(productionOrderShellWeightChecksService.delete).toHaveBeenCalledWith(
      1,
    );
  });

  it('gets a ten-shell weight check for a production order', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderTenShellWeightChecksService.findByProductionOrder.mockResolvedValue(
      check,
    );

    await expect(controller.findTenShellWeightCheck(2031)).resolves.toBe(check);
    expect(
      productionOrderTenShellWeightChecksService.findByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a ten-shell weight check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderTenShellWeightChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(controller.findTenShellWeightCheckById(1)).resolves.toBe(
      check,
    );
    expect(
      productionOrderTenShellWeightChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('upserts a ten-shell weight check using the authenticated user', async () => {
    const createDto = {
      ten_shells_weight: 500.04,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderTenShellWeightChecksService.upsert.mockResolvedValue(result);

    await expect(
      controller.upsertTenShellWeightCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderTenShellWeightChecksService.upsert,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a ten-shell weight check', async () => {
    const updateDto = {
      ten_shells_weight: 510.25,
    };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderTenShellWeightChecksService.update.mockResolvedValue(result);

    await expect(
      controller.updateTenShellWeightCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderTenShellWeightChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a ten-shell weight check', async () => {
    const result = { id: 1, production_order_id: 2031 };
    productionOrderTenShellWeightChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteTenShellWeightCheck(1)).resolves.toBe(result);
    expect(
      productionOrderTenShellWeightChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets semi-finished gross weight checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderSemiFinishedGrossWeightChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(
      controller.findSemiFinishedGrossWeightChecks(2031),
    ).resolves.toBe(checks);
    expect(
      productionOrderSemiFinishedGrossWeightChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a semi-finished gross weight check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderSemiFinishedGrossWeightChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(
      controller.findSemiFinishedGrossWeightCheckById(1),
    ).resolves.toBe(check);
    expect(
      productionOrderSemiFinishedGrossWeightChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a semi-finished gross weight check', async () => {
    const createDto = {
      requirement: 'Khối lượng cả vỏ từ 0.480 g đến 0.520 g',
      unit: 'mg',
      unit_1_gross_weight: 0.501,
      unit_2_gross_weight: 0.498,
      unit_3_gross_weight: 0.503,
      unit_4_gross_weight: 0.5,
      unit_5_gross_weight: 0.499,
      unit_6_gross_weight: 0.502,
      unit_7_gross_weight: 0.497,
      unit_8_gross_weight: 0.504,
      unit_9_gross_weight: 0.496,
      unit_10_gross_weight: 0.505,
    };
    const user = { id: 7 };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSemiFinishedGrossWeightChecksService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createSemiFinishedGrossWeightCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderSemiFinishedGrossWeightChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a semi-finished gross weight check', async () => {
    const updateDto = { unit_2_gross_weight: 0.51, unit: 'mg' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSemiFinishedGrossWeightChecksService.update.mockResolvedValue(
      result,
    );

    await expect(
      controller.updateSemiFinishedGrossWeightCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderSemiFinishedGrossWeightChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a semi-finished gross weight check', async () => {
    const result = { id: 1 };
    productionOrderSemiFinishedGrossWeightChecksService.delete.mockResolvedValue(
      result,
    );

    await expect(
      controller.deleteSemiFinishedGrossWeightCheck(1),
    ).resolves.toBe(result);
    expect(
      productionOrderSemiFinishedGrossWeightChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets semi-finished net weight checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderSemiFinishedNetWeightChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(
      controller.findSemiFinishedNetWeightChecks(2031),
    ).resolves.toBe(checks);
    expect(
      productionOrderSemiFinishedNetWeightChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a semi-finished net weight check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderSemiFinishedNetWeightChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(
      controller.findSemiFinishedNetWeightCheckById(1),
    ).resolves.toBe(check);
    expect(
      productionOrderSemiFinishedNetWeightChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a semi-finished net weight check', async () => {
    const createDto = {
      requirement: 'Khối lượng không vỏ từ 0.380 g đến 0.420 g',
      unit_1_net_weight: 0.401,
      unit_2_net_weight: 0.398,
      unit_10_net_weight: 0.405,
      unit: 'mg',
    };
    const user = { id: 7 };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSemiFinishedNetWeightChecksService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createSemiFinishedNetWeightCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderSemiFinishedNetWeightChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a semi-finished net weight check', async () => {
    const updateDto = { unit_2_net_weight: 0.41, unit: 'mg' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSemiFinishedNetWeightChecksService.update.mockResolvedValue(
      result,
    );

    await expect(
      controller.updateSemiFinishedNetWeightCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderSemiFinishedNetWeightChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a semi-finished net weight check', async () => {
    const result = { id: 1 };
    productionOrderSemiFinishedNetWeightChecksService.delete.mockResolvedValue(
      result,
    );

    await expect(controller.deleteSemiFinishedNetWeightCheck(1)).resolves.toBe(
      result,
    );
    expect(
      productionOrderSemiFinishedNetWeightChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets leak tightness checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderLeakTightnessChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findLeakTightnessChecks(2031)).resolves.toBe(
      checks,
    );
    expect(
      productionOrderLeakTightnessChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a leak tightness check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderLeakTightnessChecksService.findById.mockResolvedValue(check);

    await expect(controller.findLeakTightnessCheckById(1)).resolves.toBe(check);
    expect(
      productionOrderLeakTightnessChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a leak tightness check using the authenticated user', async () => {
    const createDto = {
      requirement: 'Không được rò rỉ',
      unit_1_result: true,
      unit_2_result: false,
    };
    const user = { id: 7 };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderLeakTightnessChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createLeakTightnessCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderLeakTightnessChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a leak tightness check', async () => {
    const updateDto = { unit_2_result: true };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderLeakTightnessChecksService.update.mockResolvedValue(result);

    await expect(
      controller.updateLeakTightnessCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderLeakTightnessChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a leak tightness check', async () => {
    const result = { id: 1 };
    productionOrderLeakTightnessChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteLeakTightnessCheck(1)).resolves.toBe(result);
    expect(
      productionOrderLeakTightnessChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets hardness checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderHardnessChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findHardnessChecks(2031)).resolves.toBe(checks);
    expect(
      productionOrderHardnessChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a hardness check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderHardnessChecksService.findById.mockResolvedValue(check);

    await expect(controller.findHardnessCheckById(1)).resolves.toBe(check);
    expect(productionOrderHardnessChecksService.findById).toHaveBeenCalledWith(
      1,
    );
  });

  it('creates a hardness check using the authenticated user', async () => {
    const createDto = {
      requirement: 'Độ cứng từ 70 N đến 90 N',
      dosage_form_stage: 'tablet',
      unit_1_hardness: 80,
      unit_2_hardness: 81,
    };
    const user = { id: 7 };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderHardnessChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createHardnessCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderHardnessChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('updates a hardness check', async () => {
    const updateDto = { unit_2_hardness: 82, unit: 'N' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderHardnessChecksService.update.mockResolvedValue(result);

    await expect(controller.updateHardnessCheck(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderHardnessChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('deletes a hardness check', async () => {
    const result = { id: 1 };
    productionOrderHardnessChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteHardnessCheck(1)).resolves.toBe(result);
    expect(productionOrderHardnessChecksService.delete).toHaveBeenCalledWith(1);
  });

  it('gets factory release reviews for a production order', async () => {
    const reviews = [{ id: 1, production_order_id: 2031 }];
    productionOrderFactoryReleaseReviewsService.findAllByProductionOrder.mockResolvedValue(
      reviews,
    );

    await expect(controller.findFactoryReleaseReviews(2031)).resolves.toBe(
      reviews,
    );
    expect(
      productionOrderFactoryReleaseReviewsService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a factory release review by id', async () => {
    const review = { id: 1, production_order_id: 2031 };
    productionOrderFactoryReleaseReviewsService.findById.mockResolvedValue(
      review,
    );

    await expect(controller.findFactoryReleaseReviewById(1)).resolves.toBe(
      review,
    );
    expect(
      productionOrderFactoryReleaseReviewsService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a factory release review', async () => {
    const createDto = {
      registration_number: 'VD-12345-26',
      raw_material_test_result: 'Đạt',
      yield_quantity: '1200.5',
    };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderFactoryReleaseReviewsService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createFactoryReleaseReview(2031, createDto),
    ).resolves.toBe(result);
    expect(
      productionOrderFactoryReleaseReviewsService.create,
    ).toHaveBeenCalledWith(2031, createDto);
  });

  it('updates a factory release review', async () => {
    const updateDto = { deviation: 'Không có' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderFactoryReleaseReviewsService.update.mockResolvedValue(
      result,
    );

    await expect(
      controller.updateFactoryReleaseReview(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderFactoryReleaseReviewsService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a factory release review', async () => {
    const result = { id: 1 };
    productionOrderFactoryReleaseReviewsService.delete.mockResolvedValue(
      result,
    );

    await expect(controller.deleteFactoryReleaseReview(1)).resolves.toBe(
      result,
    );
    expect(
      productionOrderFactoryReleaseReviewsService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets vial inspection checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031, bag_number: 1 }];
    productionOrderVialInspectionChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findVialInspectionChecks(2031)).resolves.toBe(
      checks,
    );
    expect(
      productionOrderVialInspectionChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a vial inspection check by id', async () => {
    const check = { id: 1, production_order_id: 2031, bag_number: 1 };
    productionOrderVialInspectionChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(controller.findVialInspectionCheckById(1)).resolves.toBe(
      check,
    );
    expect(
      productionOrderVialInspectionChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a vial inspection check using the authenticated user', async () => {
    const createDto = {
      bag_number: 1,
      fiber_vial_count: 1,
      particulate_count: 2,
      damaged_count: 0,
      other_defect_count: 3,
      note: 'can theo doi',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderVialInspectionChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createVialInspectionCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderVialInspectionChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a vial inspection check', async () => {
    const updateDto = {
      bag_number: 2,
      note: null,
    };
    const result = { id: 1, production_order_id: 2031, bag_number: 2 };
    productionOrderVialInspectionChecksService.update.mockResolvedValue(result);

    await expect(
      controller.updateVialInspectionCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderVialInspectionChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a vial inspection check', async () => {
    const result = { id: 1, production_order_id: 2031 };
    productionOrderVialInspectionChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteVialInspectionCheck(1)).resolves.toBe(result);
    expect(
      productionOrderVialInspectionChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets a cylinder calibration for a production order', async () => {
    const calibration = {
      id: 1,
      production_order_id: 2031,
      cylinder_code: 'OD-001',
      calibration_number: 0.1234,
    };
    productionOrderCylinderCalibrationsService.findByProductionOrder.mockResolvedValue(
      calibration,
    );

    await expect(controller.findCylinderCalibration(2031)).resolves.toBe(
      calibration,
    );
    expect(
      productionOrderCylinderCalibrationsService.findByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('upserts a cylinder calibration using the authenticated user', async () => {
    const createDto = {
      cylinder_code: 'OD-001',
      calibration_number: '0.1234',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderCylinderCalibrationsService.upsert.mockResolvedValue(result);

    await expect(
      controller.upsertCylinderCalibration(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderCylinderCalibrationsService.upsert,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a cylinder calibration', async () => {
    const updateDto = {
      cylinder_code: 'OD-002',
    };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderCylinderCalibrationsService.update.mockResolvedValue(result);

    await expect(
      controller.updateCylinderCalibration(2031, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderCylinderCalibrationsService.update,
    ).toHaveBeenCalledWith(2031, updateDto);
  });

  it('deletes a cylinder calibration', async () => {
    const result = { id: 1, production_order_id: 2031 };
    productionOrderCylinderCalibrationsService.delete.mockResolvedValue(result);

    await expect(controller.deleteCylinderCalibration(2031)).resolves.toBe(
      result,
    );
    expect(
      productionOrderCylinderCalibrationsService.delete,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets sensory checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031, color: 'vang nhat' }];
    productionOrderSensoryChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findSensoryChecks(2031)).resolves.toBe(checks);
    expect(
      productionOrderSensoryChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a sensory check by id', async () => {
    const check = { id: 1, production_order_id: 2031, smell: 'thom' };
    productionOrderSensoryChecksService.findById.mockResolvedValue(check);

    await expect(controller.findSensoryCheckById(1)).resolves.toBe(check);
    expect(productionOrderSensoryChecksService.findById).toHaveBeenCalledWith(
      1,
    );
  });

  it('creates a sensory check using the authenticated user', async () => {
    const createDto = {
      color: 'vang nhat',
      smell: 'thom',
      taste: 'ngot',
      note: 'dat yeu cau',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSensoryChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createSensoryCheck(2031, createDto, undefined, { user }),
    ).resolves.toBe(result);
    expect(productionOrderSensoryChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
      {
        imagePaths: [],
      },
    );
  });

  it('updates a sensory check', async () => {
    const updateDto = {
      color: 'vang dam',
    };
    const result = { id: 1, color: 'vang dam' };
    productionOrderSensoryChecksService.update.mockResolvedValue(result);

    await expect(controller.updateSensoryCheck(1, updateDto)).resolves.toBe(
      result,
    );
    expect(productionOrderSensoryChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });

  it('adds sensory check images using the authenticated user', async () => {
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, images: [] };
    productionOrderSensoryChecksService.addImages.mockResolvedValue(result);

    await expect(
      controller.addSensoryCheckImages(1, undefined, { user }),
    ).resolves.toBe(result);
    expect(productionOrderSensoryChecksService.addImages).toHaveBeenCalledWith(
      1,
      [],
      user,
    );
  });

  it('deletes a sensory check image', async () => {
    const result = { id: 1 };
    productionOrderSensoryChecksService.deleteImage.mockResolvedValue(result);

    await expect(controller.deleteSensoryCheckImage(1)).resolves.toBe(result);
    expect(
      productionOrderSensoryChecksService.deleteImage,
    ).toHaveBeenCalledWith(1);
  });

  it('deletes a sensory check', async () => {
    const result = { id: 1 };
    productionOrderSensoryChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteSensoryCheck(1)).resolves.toBe(result);
    expect(productionOrderSensoryChecksService.delete).toHaveBeenCalledWith(1);
  });

  it('gets ten-unit sensory checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderTenUnitSensoryChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findTenUnitSensoryChecks(2031)).resolves.toBe(
      checks,
    );
    expect(
      productionOrderTenUnitSensoryChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a ten-unit sensory check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderTenUnitSensoryChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(controller.findTenUnitSensoryCheckById(1)).resolves.toBe(
      check,
    );
    expect(
      productionOrderTenUnitSensoryChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a ten-unit sensory check using the authenticated user', async () => {
    const createDto = {
      requirement: 'Đạt yêu cầu cảm quan',
      unit_1_result: true,
      unit_2_result: 'Đạt',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderTenUnitSensoryChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createTenUnitSensoryCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderTenUnitSensoryChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('updates a ten-unit sensory check', async () => {
    const updateDto = {
      unit_2_result: null,
    };
    const result = { id: 1, unit_2_result: null };
    productionOrderTenUnitSensoryChecksService.update.mockResolvedValue(result);

    await expect(
      controller.updateTenUnitSensoryCheck(1, updateDto),
    ).resolves.toBe(result);
    expect(
      productionOrderTenUnitSensoryChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto);
  });

  it('deletes a ten-unit sensory check', async () => {
    const result = { id: 1 };
    productionOrderTenUnitSensoryChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteTenUnitSensoryCheck(1)).resolves.toBe(result);
    expect(
      productionOrderTenUnitSensoryChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets steam sterilization checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderSteamSterilizationChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findSteamSterilizationChecks(2031)).resolves.toBe(
      checks,
    );
    expect(
      productionOrderSteamSterilizationChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a steam sterilization check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderSteamSterilizationChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(controller.findSteamSterilizationCheckById(1)).resolves.toBe(
      check,
    );
    expect(
      productionOrderSteamSterilizationChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a steam sterilization check using the authenticated user', async () => {
    const createDto = {
      equipment_name: 'Noi hap 1',
      setting_temperature: 121,
      setting_time: 30,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSteamSterilizationChecksService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createSteamSterilizationCheck(2031, createDto, undefined, {
        user,
      }),
    ).resolves.toBe(result);
    expect(
      productionOrderSteamSterilizationChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user, {
      configurationImagePath: undefined,
      indicatorImagePath: undefined,
      reachedTemperatureImagePath: undefined,
    });
  });

  it('updates a steam sterilization check', async () => {
    const updateDto = {
      setting_temperature: 122,
    };
    const result = { id: 1, setting_temperature: '122.00' };
    productionOrderSteamSterilizationChecksService.update.mockResolvedValue(
      result,
    );

    await expect(
      controller.updateSteamSterilizationCheck(1, updateDto, undefined),
    ).resolves.toBe(result);
    expect(
      productionOrderSteamSterilizationChecksService.update,
    ).toHaveBeenCalledWith(1, updateDto, {
      configurationImagePath: undefined,
      indicatorImagePath: undefined,
      reachedTemperatureImagePath: undefined,
    });
  });

  it('deletes a steam sterilization check', async () => {
    const result = { id: 1 };
    productionOrderSteamSterilizationChecksService.delete.mockResolvedValue(
      result,
    );

    await expect(controller.deleteSteamSterilizationCheck(1)).resolves.toBe(
      result,
    );
    expect(
      productionOrderSteamSterilizationChecksService.delete,
    ).toHaveBeenCalledWith(1);
  });

  it('gets date checks for a production order', async () => {
    const dateChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderDateChecksService.findAllByProductionOrder.mockResolvedValue(
      dateChecks,
    );

    await expect(controller.findDateChecks(2031)).resolves.toBe(dateChecks);
    expect(
      productionOrderDateChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a date check by id', async () => {
    const dateCheck = { id: 1, production_order_id: 2031 };
    productionOrderDateChecksService.findById.mockResolvedValue(dateCheck);

    await expect(controller.findDateCheckById(1)).resolves.toBe(dateCheck);
    expect(productionOrderDateChecksService.findById).toHaveBeenCalledWith(1);
  });

  it('creates a date check using the authenticated user', async () => {
    const createDto = { package_type: 'goi' };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderDateChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createDateCheck(2031, createDto, undefined, { user }),
    ).resolves.toBe(result);
    expect(productionOrderDateChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
      {
        requestFilePath: undefined,
      },
    );
  });

  it('updates a date check request data', async () => {
    const updateDto = { package_type: 'lo' };
    const result = { id: 1, package_type: 'lo' };
    productionOrderDateChecksService.update.mockResolvedValue(result);

    await expect(
      controller.updateDateCheck(1, updateDto, undefined),
    ).resolves.toBe(result);
    expect(productionOrderDateChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
      {
        requestFilePath: undefined,
      },
    );
  });

  it('approves a date check using the authenticated user', async () => {
    const approveDto = { approval_status: 'approved' };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, approval_status: 'approved' };
    productionOrderDateChecksService.approve.mockResolvedValue(result);

    await expect(
      controller.approveDateCheck(1, approveDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderDateChecksService.approve).toHaveBeenCalledWith(
      1,
      approveDto,
      user,
    );
  });

  it('deletes a date check', async () => {
    const result = { id: 1 };
    productionOrderDateChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteDateCheck(1)).resolves.toBe(result);
    expect(productionOrderDateChecksService.delete).toHaveBeenCalledWith(1);
  });

  it('adds date check images using the authenticated user', async () => {
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, images: [] };
    productionOrderDateChecksService.addImages.mockResolvedValue(result);

    await expect(
      controller.addDateCheckImages(1, undefined, { user }),
    ).resolves.toBe(result);
    expect(productionOrderDateChecksService.addImages).toHaveBeenCalledWith(
      1,
      [],
      user,
    );
  });

  it('deletes a date check image', async () => {
    const result = { id: 1 };
    productionOrderDateChecksService.deleteImage.mockResolvedValue(result);

    await expect(controller.deleteDateCheckImage(1)).resolves.toBe(result);
    expect(productionOrderDateChecksService.deleteImage).toHaveBeenCalledWith(
      1,
    );
  });

  it('gets finished product summaries for a production order', async () => {
    const summaries = [{ id: 1, production_order_id: 2031 }];
    productionOrderFinishedProductSummariesService.findAllByProductionOrder.mockResolvedValue(
      summaries,
    );

    await expect(controller.findFinishedProductSummaries(2031)).resolves.toBe(
      summaries,
    );
    expect(
      productionOrderFinishedProductSummariesService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets all finished product summaries', async () => {
    const summaries = [{ id: 1, production_order_id: 2031 }];
    productionOrderFinishedProductSummariesService.findAll.mockResolvedValue(
      summaries,
    );

    await expect(controller.findAllFinishedProductSummaries()).resolves.toBe(
      summaries,
    );
    expect(
      productionOrderFinishedProductSummariesService.findAll,
    ).toHaveBeenCalledTimes(1);
  });

  it('gets a finished product summary by id', async () => {
    const summary = { id: 1, production_order_id: 2031 };
    productionOrderFinishedProductSummariesService.findById.mockResolvedValue(
      summary,
    );

    await expect(controller.findFinishedProductSummaryById(1)).resolves.toBe(
      summary,
    );
    expect(
      productionOrderFinishedProductSummariesService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a finished product summary using the authenticated user', async () => {
    const createDto = {
      package_count: 12,
      boxes_per_package: 24,
      loose_box_count: 3,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderFinishedProductSummariesService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createFinishedProductSummary(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderFinishedProductSummariesService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('sets download headers and returns a streamable file when exporting production order lines', async () => {
    const buffer = Buffer.from('xlsx-content');
    productionOrdersService.exportProductionOrderLines.mockResolvedValue({
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'warehouse-release-order-2031.xlsx',
    });
    const response = {
      set: jest.fn(),
    } as unknown as Response;

    const exportOptions = { stageIds: [2, 3] };

    const result = await controller.exportProductionOrderLines(
      2031,
      exportOptions,
      response,
    );

    expect(
      productionOrdersService.exportProductionOrderLines,
    ).toHaveBeenCalledWith(2031, exportOptions);
    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="warehouse-release-order-2031.xlsx"; filename*=UTF-8\'\'warehouse-release-order-2031.xlsx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('uses an ASCII fallback filename when the exported filename has Vietnamese characters', async () => {
    const buffer = Buffer.from('xlsx-content');
    productionOrdersService.exportProductionOrderLines.mockResolvedValue({
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'PXK Thành phẩm test 010126.xlsx',
    });
    const response = {
      set: jest.fn(),
    } as unknown as Response;

    await controller.exportProductionOrderLines(2031, {}, response);

    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="PXK Thanh pham test 010126.xlsx"; filename*=UTF-8\'\'PXK%20Th%C3%A0nh%20ph%E1%BA%A9m%20test%20010126.xlsx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });

  it('sets download headers and returns a streamable file when exporting a weighing ticket', async () => {
    const buffer = Buffer.from('xlsx-content');
    productionOrdersService.exportWeighingTicket.mockResolvedValue({
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'Phieu can Thanh pham test 010126.xlsx',
    });
    const response = {
      set: jest.fn(),
    } as unknown as Response;

    const exportOptions = { stageIds: [2, 3] };

    const result = await controller.exportWeighingTicket(
      2031,
      exportOptions,
      response,
    );

    expect(productionOrdersService.exportWeighingTicket).toHaveBeenCalledWith(
      2031,
      exportOptions,
    );
    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="Phieu can Thanh pham test 010126.xlsx"; filename*=UTF-8\'\'Phieu%20can%20Thanh%20pham%20test%20010126.xlsx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('sets download headers and returns a streamable file when exporting a post-weighing material check', async () => {
    const buffer = Buffer.from('xlsx-content');
    productionOrdersService.exportPostWeighingMaterialCheck.mockResolvedValue({
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'Phieu kiem tra sau can Thanh pham test 010126.xlsx',
    });
    const response = {
      set: jest.fn(),
    } as unknown as Response;

    const exportOptions = { stageIds: [2, 3] };

    const result = await controller.exportPostWeighingMaterialCheck(
      2031,
      exportOptions,
      response,
    );

    expect(
      productionOrdersService.exportPostWeighingMaterialCheck,
    ).toHaveBeenCalledWith(2031, exportOptions);
    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="Phieu kiem tra sau can Thanh pham test 010126.xlsx"; filename*=UTF-8\'\'Phieu%20kiem%20tra%20sau%20can%20Thanh%20pham%20test%20010126.xlsx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
