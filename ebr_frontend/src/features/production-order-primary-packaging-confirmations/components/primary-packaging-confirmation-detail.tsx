"use client";

import useSWR from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { PrimaryPackagingConfirmation } from "../types";
import {
  formatConfirmationResult,
  formatDateTime,
  getConfirmationUserLabel,
} from "../utils";

function PrimaryPackagingConfirmationDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <Skeleton className="h-9 w-64" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrimaryPackagingConfirmationDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<PrimaryPackagingConfirmation>(
    API_ROUTES.productionOrders.primaryPackagingConfirmationDetail(id),
    () => productionOrdersService.fetchPrimaryPackagingConfirmationById(id),
  );

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Xác nhận trước đóng gói bao bì cấp 1"
          onClose={onClose}
        />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản xác nhận.
        </div>
      </div>
    );
  }

  if (!data) {
    return <PrimaryPackagingConfirmationDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Xác nhận trước đóng gói bao bì cấp 1 #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        onClose={onClose}
      />

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={String(data.production_order_id)}
        />
        <FieldDisplay
          lable="Thể tích/khối lượng"
          value={formatConfirmationResult(data.volume_weight_checked)}
        />
        <FieldDisplay
          lable="Cảm quan"
          value={formatConfirmationResult(data.sensory_checked)}
        />
        <FieldDisplay
          lable="In date"
          value={formatConfirmationResult(data.date_print_checked)}
        />
        <FieldDisplay
          lable="Vệ sinh"
          value={formatConfirmationResult(data.hygiene_checked)}
        />
        <FieldDisplay
          lable="Độ kín"
          value={formatConfirmationResult(data.seal_integrity_checked)}
        />
        <FieldDisplay lable="Ghi chú" value={data.note || "-"} />
        <FieldDisplay
          lable="Người kiểm tra"
          value={getConfirmationUserLabel(data.createdBy)}
        />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
      </div>
    </div>
  );
}
