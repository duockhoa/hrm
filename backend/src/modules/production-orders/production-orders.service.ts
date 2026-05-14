import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import axios from 'axios';

type SapProductionOrderLine = {
  StageID?: number | null;
  UoMEntry?: number | null;
  [key: string]: unknown;
};

type SapProductionOrderStage = {
  StageID?: number | null;
  [key: string]: unknown;
};

type SapProductionOrderResponse = {
  ProductionOrderLines?: SapProductionOrderLine[];
  ProductionOrdersStages?: SapProductionOrderStage[];
};

type SapUnitOfMeasurement = {
  AbsEntry?: number | null;
  Code?: string | null;
  Name?: string | null;
  [key: string]: unknown;
};

@Injectable()
export class ProductionOrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.productionOrders.findMany({
      include: {
        item: true,
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
      },
    });
  }

  async findProductionOrderLines(id: number) {
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

    return productionOrderLines.map((line) => ({
      ...line,
      ProductionOrdersStage:
        typeof line.StageID === 'number'
          ? (stagesById.get(line.StageID) ?? null)
          : null,
      UnitOfMeasurement:
        typeof line.UoMEntry === 'number'
          ? (unitOfMeasurementsByAbsEntry.get(line.UoMEntry) ?? null)
          : null,
    }));
  }
}
