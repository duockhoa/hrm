"use client";

import { API_ROUTES } from "@/lib/api-routes";
import EditHistoryButton from "./edit-history-button";
import {
  PRODUCTION_ORDER_HISTORY_FIELDS,
  type ProductionOrderHistoryResource,
} from "./production-order-history-config";
import { PRODUCTION_ORDER_HISTORY_ENTITY_LABELS } from "./production-order-history-labels";

export type ProductionOrderHistorySelection = {
  resource: ProductionOrderHistoryResource;
  id?: string | number | null;
  scope?: "record" | "production-order";
};

export default function ProductionOrderHistoryButton({
  resource,
  id,
  title,
  scope,
}: ProductionOrderHistorySelection & { title: string }) {
  if (id === null || id === undefined) return null;
  return (
    <EditHistoryButton
      key={`${resource}:${id}:${scope ?? "record"}`}
      historyUrl={API_ROUTES.productionOrders.recordHistory(
        resource,
        id,
        scope,
      )}
      title={title}
      fields={PRODUCTION_ORDER_HISTORY_FIELDS[resource]}
      entityLabels={PRODUCTION_ORDER_HISTORY_ENTITY_LABELS}
    />
  );
}
