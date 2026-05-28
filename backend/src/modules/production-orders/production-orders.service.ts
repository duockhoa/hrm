import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import axios from 'axios';
import { WarehouseReleaseExportService } from './exports/warehouse-release-export.service';
import type {
  ExportProductionOrderLinesDto,
  ProductionOrderStageIdFilter,
} from './dto/export-production-order-lines.dto';

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

const productionOrderSamplingRequestInclude = {
  orderBy: {
    sent_at: 'desc' as const,
  },
  take: 1,
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

@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly warehouseReleaseExportService: WarehouseReleaseExportService,
  ) {}

  async findAll() {
    return this.prismaService.productionOrders.findMany({
      include: {
        item: true,
        samplingRequests: productionOrderSamplingRequestInclude,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findFinishedProducts() {
    return this.prismaService.productionOrders.findMany({
      where: {
        item_code: {
          startsWith: 'TP',
        },
      },
      include: {
        item: true,
        samplingRequests: productionOrderSamplingRequestInclude,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findSemiFinishedProducts() {
    return this.prismaService.productionOrders.findMany({
      where: {
        item_code: {
          startsWith: 'BTP',
        },
      },
      include: {
        item: true,
        samplingRequests: productionOrderSamplingRequestInclude,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findProductionOrderById(id: number) {
    return this.prismaService.productionOrders.findUnique({
      where: {
        id,
      },
      include: {
        item: true,
        samplingRequests: productionOrderSamplingRequestInclude,
      },
    });
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

  async exportProductionOrderLines(
    id: number,
    options?: ExportProductionOrderLinesDto,
  ) {
    const { productionOrder, lines } =
      await this.findProductionOrderLineData(id);
    const stageIds = normalizeStageIds(getStageIdFilterInput(options));
    const stageIdSet = stageIds ? new Set(stageIds) : undefined;
    const filteredLines = stageIdSet
      ? lines.filter(
          (line) =>
            typeof line.StageID === 'number' && stageIdSet.has(line.StageID),
        )
      : lines;

    return this.warehouseReleaseExportService.export(
      id,
      filteredLines,
      productionOrder,
    );
  }
}
