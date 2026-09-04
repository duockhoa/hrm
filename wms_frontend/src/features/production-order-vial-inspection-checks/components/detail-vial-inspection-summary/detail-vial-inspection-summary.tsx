"use client";

import useSWR from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderVialInspectionCheck } from "../../types";
import { formatInteger, formatText } from "../../utils";

const toNumber = (value: string | number | null | undefined) => {
  const numberValue = Number(value ?? 0);

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const sumBy = (
  data: ProductionOrderVialInspectionCheck[],
  key:
    | "bag_number"
    | "fiber_vial_count"
    | "particulate_count"
    | "damaged_count"
    | "other_defect_count",
) => data.reduce((total, item) => total + toNumber(item[key]), 0);

const joinNotes = (data: ProductionOrderVialInspectionCheck[]) =>
  data
    .map((item) => item.note?.trim())
    .filter(Boolean)
    .join("; ");

function VialInspectionSummaryDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VialInspectionSummaryDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderVialInspectionCheck[]>(
    API_ROUTES.productionOrders.vialInspectionChecks(id),
    () => productionOrdersService.fetchVialInspectionChecks(id),
  );

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Tổng kết soi lọ" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không thể tải tổng kết soi lọ.
        </div>
      </div>
    );
  }

  if (!data) {
    return <VialInspectionSummaryDetailSkeleton />;
  }

  const totalBagNumber = sumBy(data, "bag_number");
  const totalFiberVialCount = sumBy(data, "fiber_vial_count");
  const totalParticulateCount = sumBy(data, "particulate_count");
  const totalDamagedCount = sumBy(data, "damaged_count");
  const totalOtherDefectCount = sumBy(data, "other_defect_count");
  const totalNote = joinNotes(data);

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title="Tổng kết soi lọ"
        subtitle={`Lệnh sản xuất #${id}`}
        onClose={onClose}
      />

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay lable="Mã lệnh sản xuất" value={formatText(id)} />
        <FieldDisplay
          lable="Số bản ghi soi lọ"
          value={formatInteger(data.length)}
        />
        <FieldDisplay lable="Bao số" value={formatInteger(totalBagNumber)} />
        <FieldDisplay
          lable="Số lọ có sợi"
          value={formatInteger(totalFiberVialCount)}
        />
        <FieldDisplay
          lable="Số lượng vẩn"
          value={formatInteger(totalParticulateCount)}
        />
        <FieldDisplay
          lable="Số lượng hỏng"
          value={formatInteger(totalDamagedCount)}
        />
        <FieldDisplay
          lable="Số lượng lỗi khác"
          value={formatInteger(totalOtherDefectCount)}
        />
        <FieldDisplay lable="Ghi chú" value={formatText(totalNote)} />
      </div>
    </div>
  );
}
