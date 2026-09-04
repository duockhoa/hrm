"use client";

import useSWR from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import InlineMaterialSummarySection from "../inline-material-summary-section/inline-material-summary-section";
import type { ProductionOrderLine } from "../../utils";

function ProductionOrderLinesDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <Skeleton className="h-9 w-64" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function ProductionOrderLinesDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const {
    data: productionOrderLines,
    error: productionOrderLinesError,
  } = useSWR<ProductionOrderLine[]>(
    `${API_ROUTES.productionOrders.base}/${id}/production-order-lines`,
    () => productionOrdersService.fetchProductionOrderLines(id),
  );

  if (productionOrderLinesError) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Tổng kết vật liệu" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không thể tải thông tin dòng lệnh sản xuất.
        </div>
      </div>
    );
  }

  if (!productionOrderLines) {
    return <ProductionOrderLinesDetailSkeleton />;
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Tổng kết vật liệu"
          subtitle={`Mã lệnh sản xuất ${id}`}
          onClose={onClose}
        />
      </div>
      <InlineMaterialSummarySection
        productionOrderId={id}
        productionOrderLines={productionOrderLines}
      />
    </div>
  );
}
