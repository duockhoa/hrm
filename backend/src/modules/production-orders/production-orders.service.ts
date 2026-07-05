import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import axios from 'axios';
import { WarehouseReleaseExportService } from './exports/warehouse-release-export.service';
import { ProductionOrderExportService } from './exports/production-order-export.service';
import { WeighingTicketExportService } from './exports/weighing-ticket-export.service';
import type {
  ExportProductionOrderLinesDto,
  ProductionOrderStageIdFilter,
} from './dto/export-production-order-lines.dto';
import { FeaturesService } from '../features/features.service';

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
    private readonly productionOrderExportService: ProductionOrderExportService,
  ) {}

  async findAll() {
    const productionOrders = await this.prismaService.productionOrders.findMany(
      {
        include: {
          item: true,
          samplingRequests: productionOrderSamplingRequestWithSenderInclude,
        },
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
        include: {
          item: true,
          samplingRequests: productionOrderSamplingRequestWithSenderInclude,
        },
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
        include: {
          item: true,
          samplingRequests: productionOrderSamplingRequestWithSenderInclude,
        },
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
        include: {
          item: true,
          samplingRequests: productionOrderSamplingRequestWithSenderInclude,
        },
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
    const latestSamplingRequest = productionOrder.samplingRequests[0] ?? null;

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
    const [productionOrderResponse, unitOfMeasurementsResponse] =
      await Promise.all([
        axios.get<SapProductionOrderResponse>(
          `https://sap-b1-connector.dkpharma.io.vn/production-orders/${id}`,
        ),
        axios.get<SapUnitOfMeasurement[]>(
          'https://sap-b1-connector.dkpharma.io.vn/unit-of-measurements',
        ),
      ]);
    const productionOrderLines =
      productionOrderResponse.data.ProductionOrderLines ?? [];
    const productionOrdersStages =
      productionOrderResponse.data.ProductionOrdersStages ?? [];
    const unitOfMeasurements = Array.isArray(unitOfMeasurementsResponse.data)
      ? unitOfMeasurementsResponse.data
      : [];
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
      productionOrder: productionOrderResponse.data,
      lines,
    };
  }

  async findProductionOrderLines(
    id: number,
  ): Promise<ProductionOrderLineWithRelations[]> {
    const { lines } = await this.findProductionOrderLineData(id);

    return lines;
  }

  async exportProductionOrder(id: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id,
        },
        include: {
          item: true,
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }

    return this.productionOrderExportService.export(productionOrder);
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
}
