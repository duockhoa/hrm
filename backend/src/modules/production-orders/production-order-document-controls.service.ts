import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { FeaturesService } from '../features/features.service';
import { createFeatureConfigSnapshot } from '../features/item-feature-config';

type AuthenticatedUser = {
  id?: number | string | null;
};

type DocumentControlPatch = Partial<
  Pick<
    Prisma.ProductionOrderDocumentControlsUncheckedCreateInput,
    | 'batch_record_issued_by_id'
    | 'batch_record_issued_at'
    | 'batch_record_received_by_id'
    | 'batch_record_received_at'
    | 'test_certificate_received_by_id'
    | 'test_certificate_received_at'
    | 'warehouse_release_received_by_id'
    | 'warehouse_release_received_at'
  >
>;

const documentControlUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

export const productionOrderDocumentControlInclude = {
  batchRecordIssuedBy: {
    select: documentControlUserSelect,
  },
  batchRecordReceivedBy: {
    select: documentControlUserSelect,
  },
  testCertificateReceivedBy: {
    select: documentControlUserSelect,
  },
  warehouseReleaseReceivedBy: {
    select: documentControlUserSelect,
  },
} satisfies Prisma.ProductionOrderDocumentControlsInclude;

@Injectable()
export class ProductionOrderDocumentControlsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly featuresService: FeaturesService,
  ) {}

  async findByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderDocumentControls.findUnique({
      where: {
        production_order_id: productionOrderId,
      },
      include: productionOrderDocumentControlInclude,
    });
  }

  async issueBatchRecord(productionOrderId: number, user?: AuthenticatedUser) {
    const issuedBy = this.normalizeUserId(user);
    const issuedAt = new Date();
    return this.prismaService.$transaction(async (tx) => {
      const order = await tx.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { item_code: true },
      });
      if (!order) throw new NotFoundException('Production order not found');

      // The upsert locks this dossier row before checking its snapshot. Repeat
      // issuance and concurrent requests must never replace the first snapshot.
      const documentControl = await tx.productionOrderDocumentControls.upsert({
        where: { production_order_id: productionOrderId },
        create: {
          production_order_id: productionOrderId,
          batch_record_issued_by_id: issuedBy,
          batch_record_issued_at: issuedAt,
        },
        update: {
          batch_record_issued_by_id: issuedBy,
          batch_record_issued_at: issuedAt,
        },
        include: productionOrderDocumentControlInclude,
      });
      if (documentControl.feature_config_snapshot != null)
        return documentControl;

      const config = await this.featuresService.findConfigByItemCode(
        order.item_code,
        undefined,
        tx,
      );
      return tx.productionOrderDocumentControls.update({
        where: { production_order_id: productionOrderId },
        data: {
          feature_config_snapshot: createFeatureConfigSnapshot(
            config,
            issuedAt,
          ),
        },
        include: productionOrderDocumentControlInclude,
      });
    });
  }

  async receiveBatchRecord(
    productionOrderId: number,
    user?: AuthenticatedUser,
  ) {
    return this.upsertDocumentControl(productionOrderId, {
      batch_record_received_by_id: this.normalizeUserId(user),
      batch_record_received_at: new Date(),
    });
  }

  async receiveTestCertificate(
    productionOrderId: number,
    user?: AuthenticatedUser,
  ) {
    return this.upsertDocumentControl(productionOrderId, {
      test_certificate_received_by_id: this.normalizeUserId(user),
      test_certificate_received_at: new Date(),
    });
  }

  async receiveWarehouseRelease(
    productionOrderId: number,
    user?: AuthenticatedUser,
  ) {
    return this.upsertDocumentControl(productionOrderId, {
      warehouse_release_received_by_id: this.normalizeUserId(user),
      warehouse_release_received_at: new Date(),
    });
  }

  private async upsertDocumentControl(
    productionOrderId: number,
    data: DocumentControlPatch,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderDocumentControls.upsert({
      where: {
        production_order_id: productionOrderId,
      },
      create: {
        production_order_id: productionOrderId,
        ...data,
      },
      update: data,
      include: productionOrderDocumentControlInclude,
    });
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id: productionOrderId,
        },
        select: {
          id: true,
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
