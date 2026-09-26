import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReleaseExportService } from './exports/warehouse-release-export.service';
import { ProductionOrderExportService } from './exports/production-order-export.service';
import { exportDatePrint } from './exports/date-print-export';
import { mixingRecordsReportInclude } from './exports/mixing-records-report-html';
import { WeighingTicketExportService } from './exports/weighing-ticket-export.service';
import { PostWeighingMaterialCheckExportService } from './exports/post-weighing-material-check-export.service';
import type {
  ExportProductionOrderLinesDto,
  ProductionOrderStageIdFilter,
} from './dto/export-production-order-lines.dto';
import { FeaturesService } from '../features/features.service';
import { productionOrderDocumentControlInclude } from './production-order-document-controls.service';
import { SapB1ServiceLayerClient } from '../sap-b1-connector/sap-b1-service-layer.client';
import { UpdateProductionOrderChangeContentDto } from './dto/update-production-order-change-content.dto';

export type SapProductionOrderLine = {
  StageID?: number | null;
  UoMEntry?: number | null;
  [key: string]: unknown;
};

export type SapProductionOrderStage = {
  StageID?: number | null;
  [key: string]: unknown;
};

export type SapProductionOrderResponse = {
  AbsoluteEntry?: number | null;
  DocumentNumber?: number | null;
  InventoryUOM?: string | null;
  ItemNo?: string | null;
  PlannedQuantity?: number | string | null;
  ProductDescription?: string | null;
  ProductionOrderLines?: SapProductionOrderLine[];
  ProductionOrdersStages?: SapProductionOrderStage[];
  U_SL?: string | null;
  U_MLSX?: string | null;
  [key: string]: unknown;
};

export type SapUnitOfMeasurement = {
  AbsEntry?: number | null;
  Code?: string | null;
  Name?: string | null;
  [key: string]: unknown;
};

export type ProductionOrderLineWithRelations = SapProductionOrderLine & {
  ProductionOrdersStage: SapProductionOrderStage | null;
  UnitOfMeasurement: SapUnitOfMeasurement | null;
};

type ProductionOrderSamplingRequestForPyclm = {
  status?: string | null;
  google_doc_url?: string | null;
  sent_at?: Date | null;
  location?: string | null;
  sender?: unknown | null;
};

type ProductionOrderWithSamplingRequests = {
  samplingRequests: ProductionOrderSamplingRequestForPyclm[];
};

const productionOrderSamplingRequestInclude = {
  orderBy: {
    sent_at: 'desc' as const,
  },
  take: 1,
};

const productionOrderSamplingRequestSenderSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const productionOrderSamplingRequestWithSenderInclude = {
  ...productionOrderSamplingRequestInclude,
  include: {
    sender: {
      select: productionOrderSamplingRequestSenderSelect,
    },
  },
};

const productionOrderSamplingRecordCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const productionOrderSamplingRecordsInclude = {
  include: {
    createdBy: {
      select: productionOrderSamplingRecordCreatorSelect,
    },
  },
  orderBy: [
    {
      created_at: 'desc' as const,
    },
    {
      id: 'desc' as const,
    },
  ],
};

const productionOrderFindInclude = {
  item: {
    include: {
      registration: true,
      productionSpecification: {
        include: {
          productLine: true,
          dosageForm: true,
        },
      },
    },
  },
  samplingRequests: productionOrderSamplingRequestWithSenderInclude,
  samplingRecords: productionOrderSamplingRecordsInclude,
  documentControl: {
    include: productionOrderDocumentControlInclude,
  },
} satisfies Prisma.ProductionOrdersInclude;

const getStageIdFilterInput = (
  options?: ExportProductionOrderLinesDto,
): ProductionOrderStageIdFilter | number | string | undefined => {
  if (!options) {
    return undefined;
  }

  if (options.stageIds !== undefined) {
    return options.stageIds;
  }

  if (options.StageID !== undefined) {
    return options.StageID;
  }

  return options.stageId;
};

const normalizeStageId = (stageId: number | string) => {
  if (typeof stageId === 'string' && stageId.trim() === '') {
    throw new BadRequestException('StageID must be an integer.');
  }

  const normalizedStageId = Number(stageId);

  if (!Number.isInteger(normalizedStageId)) {
    throw new BadRequestException('StageID must be an integer.');
  }

  return normalizedStageId;
};

const normalizeStageIds = (
  value: ProductionOrderStageIdFilter | number | string | undefined,
) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const stageIds = Array.isArray(value) ? value : [value];

  return [...new Set(stageIds.map((stageId) => normalizeStageId(stageId)))];
};

const filterProductionOrderLinesByStage = (
  lines: ProductionOrderLineWithRelations[],
  options?: ExportProductionOrderLinesDto,
) => {
  const stageIds = normalizeStageIds(getStageIdFilterInput(options));
  const stageIdSet = stageIds ? new Set(stageIds) : undefined;

  return stageIdSet
    ? lines.filter(
        (line) =>
          typeof line.StageID === 'number' && stageIdSet.has(line.StageID),
      )
    : lines;
};

@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly featuresService: FeaturesService,
    private readonly warehouseReleaseExportService: WarehouseReleaseExportService,
    private readonly weighingTicketExportService: WeighingTicketExportService,
    private readonly postWeighingMaterialCheckExportService: PostWeighingMaterialCheckExportService,
    private readonly productionOrderExportService: ProductionOrderExportService,
    private readonly sapB1Client: SapB1ServiceLayerClient,
  ) {}

  async findAll() {
    const productionOrders = await this.prismaService.productionOrders.findMany(
      {
        include: productionOrderFindInclude,
        orderBy: {
          id: 'desc',
        },
      },
    );

    return this.addPyclmInfoToList(productionOrders);
  }

  async findFinishedProducts() {
    const productionOrders = await this.prismaService.productionOrders.findMany(
      {
        where: {
          item_code: {
            startsWith: 'TP',
          },
        },
        include: productionOrderFindInclude,
        orderBy: {
          id: 'desc',
        },
      },
    );

    return this.addPyclmInfoToList(productionOrders);
  }

  async findSemiFinishedProducts() {
    const productionOrders = await this.prismaService.productionOrders.findMany(
      {
        where: {
          item_code: {
            not: {
              startsWith: 'TP',
            },
          },
        },
        include: productionOrderFindInclude,
        orderBy: {
          id: 'desc',
        },
      },
    );

    return this.addPyclmInfoToList(productionOrders);
  }

  async findProductionOrderById(id: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id,
        },
        include: productionOrderFindInclude,
      });

    if (!productionOrder) {
      return productionOrder;
    }

    const featureConfig = await this.featuresService.findConfigByItemCode(
      productionOrder.item_code,
    );

    return {
      ...this.addPyclmInfo(productionOrder),
      featureConfig,
    };
  }

  async updateChangeContent(
    id: number,
    dto: UpdateProductionOrderChangeContentDto,
  ) {
    if (!dto || !('change_content' in dto)) {
      throw new BadRequestException('change_content is required');
    }

    const changeContent = this.normalizeChangeContent(dto.change_content);

    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id },
        select: { id: true },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }

    return this.prismaService.productionOrders.update({
      where: { id },
      data: { change_content: changeContent },
    });
  }

  private normalizeChangeContent(value: unknown) {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('change_content must be a string');
    }

    return value.trim() || null;
  }

  private addPyclmInfoToList<T extends ProductionOrderWithSamplingRequests>(
    productionOrders: T[],
  ) {
    return productionOrders.map((productionOrder) =>
      this.addPyclmInfo(productionOrder),
    );
  }

  private addPyclmInfo<T extends ProductionOrderWithSamplingRequests>(
    productionOrder: T,
  ) {
    const latestSamplingRequest = productionOrder.samplingRequests?.[0] ?? null;

    return {
      ...productionOrder,
      pyclm: {
        isSent: latestSamplingRequest?.status === 'sent',
        status: latestSamplingRequest?.status ?? null,
        googleDocUrl: latestSamplingRequest?.google_doc_url ?? null,
        sentAt: latestSamplingRequest?.sent_at ?? null,
        location: latestSamplingRequest?.location ?? null,
        sender: latestSamplingRequest?.sender ?? null,
        latestSamplingRequest,
      },
    };
  }

  private async findProductionOrderLineData(id: number) {
    const [productionOrder, unitOfMeasurements] = await Promise.all([
      this.sapB1Client.getProductionOrderById<SapProductionOrderResponse>(id),
      this.sapB1Client.getUnitOfMeasurements<SapUnitOfMeasurement>(),
    ]);
    const productionOrderLines = productionOrder.ProductionOrderLines ?? [];
    const productionOrdersStages = productionOrder.ProductionOrdersStages ?? [];
    const stagesById = new Map<number, SapProductionOrderStage>();
    const unitOfMeasurementsByAbsEntry = new Map<
      number,
      SapUnitOfMeasurement
    >();

    for (const stage of productionOrdersStages) {
      if (typeof stage.StageID === 'number') {
        stagesById.set(stage.StageID, stage);
      }
    }

    for (const unitOfMeasurement of unitOfMeasurements) {
      if (typeof unitOfMeasurement.AbsEntry === 'number') {
        unitOfMeasurementsByAbsEntry.set(
          unitOfMeasurement.AbsEntry,
          unitOfMeasurement,
        );
      }
    }

    const lines = productionOrderLines.map(
      (line): ProductionOrderLineWithRelations => ({
        ...line,
        ProductionOrdersStage:
          typeof line.StageID === 'number'
            ? (stagesById.get(line.StageID) ?? null)
            : null,
        UnitOfMeasurement:
          typeof line.UoMEntry === 'number'
            ? (unitOfMeasurementsByAbsEntry.get(line.UoMEntry) ?? null)
            : null,
      }),
    );

    return {
      productionOrder,
      lines,
    };
  }

  async findProductionOrderLines(
    id: number,
  ): Promise<ProductionOrderLineWithRelations[]> {
    const { lines } = await this.findProductionOrderLineData(id);

    return lines;
  }

  async findDatePrintExportTemplates(id: number) {
    const order = await this.findProductionOrderForExport(id);
    return this.prismaService.datePrintTemplates.findMany({
      where: { item_code: order.item_code, status: 'active' },
      orderBy: { version: 'desc' },
    });
  }

  async exportDatePrint(id: number, templateId: number) {
    const order = await this.findProductionOrderForExport(id);
    const template = await this.prismaService.datePrintTemplates.findFirst({
      where: { id: templateId, item_code: order.item_code, status: 'active' },
    });
    if (!template) {
      throw new BadRequestException(
        'Biểu mẫu in date không thuộc mã hàng này hoặc đã ngừng sử dụng.',
      );
    }
    return exportDatePrint(order, template);
  }

  async exportProductionOrder(id: number) {
    return this.productionOrderExportService.export(
      await this.findProductionOrderForExport(id),
    );
  }

  async exportBatchReport(id: number, user?: any) {
    let lines: ProductionOrderLineWithRelations[] | undefined;
    try {
      const lineData = await this.findProductionOrderLineData(id);
      lines = lineData?.lines;
    } catch {
      lines = undefined;
    }
    const productionOrder = await this.findProductionOrderForBatchReport(id);
    return this.productionOrderExportService.exportBatchReport(
      productionOrder,
      user,
      lines,
    );
  }

  private async findProductionOrderForExport(id: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id,
        },
        include: {
          item: {
            include: {
              registration: true,
            },
          },
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }

    return productionOrder;
  }

  private async findProductionOrderForBatchReport(id: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id,
        },
        include: {
          ...productionOrderFindInclude,
          mixingRecords: {
            include: mixingRecordsReportInclude,
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          secondaryPackagingChecks: {
            include: { checkedBy: { select: { name: true, username: true } } },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          preSecondaryPackagingChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
              images: { orderBy: { id: 'asc' } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          postPreparationSolutionChecks: {
            include: { checkedBy: { select: { name: true, username: true } } },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          friabilityChecks: {
            include: { createdBy: { select: { name: true, username: true } } },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          cylinderCalibration: {
            include: { createdBy: { select: { name: true, username: true } } },
          },
          tenShellWeightCheck: {
            include: { createdBy: { select: { name: true, username: true } } },
          },
          dateChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
              approvedBy: { select: { name: true, username: true } },
              images: { orderBy: { id: 'asc' } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          attachments: {
            include: {
              enteredBy: { select: { name: true, username: true } },
              approvedBy: { select: { name: true, username: true } },
              files: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          finishedProductSummaries: {
            include: { createdBy: { select: { name: true, username: true } } },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          materialProcessSummaries: {
            include: { createdBy: { select: { name: true, username: true } } },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          factoryReleaseReviews: {
            include: { approvedBy: { select: { name: true, username: true } } },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          primaryPackagingConfirmations: {
            include: { createdBy: { select: { name: true, username: true } } },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          materialSummaries: {
            include: {
              createdBy: { select: { name: true, username: true } },
              summarizedBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          volumeChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          semiFinishedProductNetWeightChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          semiFinishedProductGrossWeightChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          leakTightnessChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          semiFinishedProductSummaries: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          shellWeightChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          disinfectantPreparations: {
            include: {
              workshop: { select: { code: true, name: true } },
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          postHomogenizationGranuleChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          tenUnitSensoryChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          hygieneChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          environmentChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ checked_at: 'asc' }, { id: 'asc' }],
          },
          registrationNumber: {
            include: {
              registration: true,
            },
          },
          deviations: {
            where: {
              deleted_at: null,
            },
            include: {
              reporter: true,
              approver: true,
            },
            orderBy: {
              created_at: 'asc',
            },
          },
          vialInspectionChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          hardCapsuleLeakageChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ checked_at: 'asc' }, { id: 'asc' }],
          },
          disintegrationChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ checked_at: 'asc' }, { id: 'asc' }],
          },
          sprayDoseChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          tabletThicknessChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          lineClearanceChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
              previousProductionOrder: {
                select: { description: true, lot_no: true },
              },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          hardnessChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          densityChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
          sensoryChecks: {
            include: {
              createdBy: { select: { name: true, username: true } },
            },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          },
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }

    if (!productionOrder.item && productionOrder.item_code) {
      const item = await this.prismaService.items.findUnique({
        where: { item_code: productionOrder.item_code },
        include: {
          registration: true,
          productionSpecification: {
            include: {
              productLine: true,
              dosageForm: true,
            },
          },
        },
      });
      if (item) {
        (productionOrder as any).item = item;
      }
    }

    const featureConfig = await this.featuresService.findConfigByItemCode(
      productionOrder.item_code,
    );

    return {
      ...this.addPyclmInfo(productionOrder),
      featureConfig,
    };
  }

  async exportProductionOrderLines(
    id: number,
    options?: ExportProductionOrderLinesDto,
  ) {
    const { productionOrder, lines } =
      await this.findProductionOrderLineData(id);
    const filteredLines = filterProductionOrderLinesByStage(lines, options);

    return this.warehouseReleaseExportService.export(
      id,
      filteredLines,
      productionOrder,
    );
  }

  async exportWeighingTicket(
    id: number,
    options?: ExportProductionOrderLinesDto,
  ) {
    const { productionOrder, lines } =
      await this.findProductionOrderLineData(id);
    const filteredLines = filterProductionOrderLinesByStage(lines, options);

    return this.weighingTicketExportService.export(
      id,
      filteredLines,
      productionOrder,
    );
  }

  async exportPostWeighingMaterialCheck(
    id: number,
    options?: ExportProductionOrderLinesDto,
  ) {
    const { productionOrder, lines } =
      await this.findProductionOrderLineData(id);
    const filteredLines = filterProductionOrderLinesByStage(lines, options);

    return this.postWeighingMaterialCheckExportService.export(
      id,
      filteredLines,
      productionOrder,
    );
  }
}
