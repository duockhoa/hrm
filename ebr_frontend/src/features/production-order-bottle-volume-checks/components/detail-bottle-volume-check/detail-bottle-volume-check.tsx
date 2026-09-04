"use client";

import useSWR from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderBottleVolumeCheck } from "../../types";
import {
  BOTTLE_VOLUME_KEYS,
  formatDateTime,
  formatText,
  formatVolume,
  getUserLabel,
} from "../../utils";

function BottleVolumeCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BottleVolumeCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderBottleVolumeCheck>(
    API_ROUTES.productionOrders.bottleVolumeCheckDetail(id),
    () => productionOrdersService.fetchBottleVolumeCheckById(id),
  );

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Thể tích lọ" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi kiểm tra thể tích lọ.
        </div>
      </div>
    );
  }

  if (!data) {
    return <BottleVolumeCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Thể tích lọ #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        onClose={onClose}
      />

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        {BOTTLE_VOLUME_KEYS.map((key, index) => (
          <FieldDisplay
            key={key}
            lable={`Thể tích lọ ${index + 1}`}
            value={`${formatVolume(data[key])} ${data.unit ?? "ml"}`.trim()}
          />
        ))}
        <FieldDisplay
          lable="Thời điểm kiểm tra"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
