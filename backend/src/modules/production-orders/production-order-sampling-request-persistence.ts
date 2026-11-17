import { Prisma } from '@prisma/client';
import { FeaturesService } from '../features/features.service';
import { createFeatureConfigSnapshot } from '../features/item-feature-config';
import {
  createProductionSpecificationSnapshot,
  productionSpecificationInclude,
} from './production-order-specification-snapshot';

export const samplingRequestInclude = {
  productionOrder: { include: { item: { include: { registration: true } } } },
  sender: {
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      department: true,
      position: true,
    },
  },
} satisfies Prisma.ProductionOrderSamplingRequestsInclude;

type Order = Prisma.ProductionOrdersGetPayload<{
  include: { item: { include: { registration: true } } };
}>;

// Shared by single-send EBR and the WMS batch sender. Never call before provider success.
export async function persistProductionOrderSamplingRequest(
  tx: Prisma.TransactionClient,
  features: Pick<FeaturesService, 'findConfigByItemCode'>,
  productionOrder: Order,
  senderId: number | null,
  location: string,
  googleDocUrl: string | null,
  sentAt: Date,
) {
  const productionOrderId = productionOrder.id;
  const documentControl = await tx.productionOrderDocumentControls.upsert({
    where: { production_order_id: productionOrderId },
    create: { production_order_id: productionOrderId },
    update: { production_order_id: productionOrderId },
    select: {
      feature_config_snapshot: true,
      production_specification_snapshot: true,
    },
  });
  if (documentControl.feature_config_snapshot == null) {
    const config = await features.findConfigByItemCode(
      productionOrder.item_code,
      undefined,
      tx,
    );
    await tx.productionOrderDocumentControls.update({
      where: { production_order_id: productionOrderId },
      data: {
        feature_config_snapshot: createFeatureConfigSnapshot(config, sentAt),
      },
    });
  }
  if (documentControl.production_specification_snapshot == null) {
    const specification = await tx.productionSpecifications.findUnique({
      where: { item_code: productionOrder.item_code },
      include: productionSpecificationInclude,
    });
    await tx.productionOrderDocumentControls.update({
      where: { production_order_id: productionOrderId },
      data: {
        production_specification_snapshot:
          createProductionSpecificationSnapshot(
            productionOrder.item_code,
            specification,
            sentAt,
            senderId,
          ),
      },
    });
  }
  const registrationNumber =
    productionOrder.item?.registration?.registration_number?.trim() ?? '';
  if (registrationNumber) {
    const data = {
      registration_id: productionOrder.item.registration?.id ?? null,
      registration_number: registrationNumber,
    };
    await tx.productionOrderRegistrationNumbers.upsert({
      where: { production_order_id: productionOrderId },
      create: { production_order_id: productionOrderId, ...data },
      update: data,
    });
  }
  return tx.productionOrderSamplingRequests.create({
    data: {
      production_order_id: productionOrderId,
      sender_id: senderId,
      location,
      google_doc_url: googleDocUrl,
      status: 'sent',
      sent_at: sentAt,
    },
    include: samplingRequestInclude,
  });
}
