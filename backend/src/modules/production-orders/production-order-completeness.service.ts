import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { FeaturesService } from '../features/features.service';
import { SapB1ServiceLayerClient } from '../sap-b1-connector/sap-b1-service-layer.client';
import { ProductionOrderLocalCompletenessService } from './production-order-local-completeness.service';

export type { SectionCompleteness } from './production-order-local-completeness.service';

@Injectable()
export class ProductionOrderCompletenessService extends ProductionOrderLocalCompletenessService {
  constructor(
    prismaService: PrismaService,
    featuresService: FeaturesService,
    private readonly sapB1Client: SapB1ServiceLayerClient,
  ) {
    super(prismaService, featuresService);
  }

  protected override async countExternalSection(
    key: string,
    id: number,
  ): Promise<number | null> {
    if (key !== 'production_order_lines') return null;
    // An unavailable SAP connection is not evidence of missing data.
    try {
      const order = await this.sapB1Client.getProductionOrderById<{
        ProductionOrderLines?: unknown[];
      }>(id);
      return order.ProductionOrderLines?.length ?? 0;
    } catch {
      return null;
    }
  }
}
