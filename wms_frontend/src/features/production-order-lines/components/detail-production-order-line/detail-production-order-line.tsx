"use client";

import useSWR from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import {
  formatDate,
  formatNumber,
  formatText,
  getProductionOrderLineStage,
  getProductionOrderLineUnit,
  parseProductionOrderLineDetailId,
  type ProductionOrderLine,
} from "../../utils";

const HANDLED_FIELDS = new Set([
  "LineNumber",
  "ItemNo",
  "ItemName",
  "U_SL",
  "U_HSD",
  "Warehouse",
  "PlannedQuantity",
  "IssuedQuantity",
  "UnitOfMeasurement",
  "ProductionOrdersStage",
]);

const formatPrimitiveValue = (value: unknown) => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "object" ||
    typeof value === "function"
  ) {
    return "";
  }

  return String(value);
};

const getRemainingQuantity = (line: ProductionOrderLine) => {
  const plannedQuantity = Number(line.PlannedQuantity);
  const issuedQuantity = Number(line.IssuedQuantity);

  if (Number.isNaN(plannedQuantity) || Number.isNaN(issuedQuantity)) {
    return "";
  }

  return formatNumber(plannedQuantity - issuedQuantity);
};

function ProductionOrderLineDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 w-[220px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductionOrderLineDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const parsedId = parseProductionOrderLineDetailId(id);
  const { data, error } = useSWR<ProductionOrderLine[]>(
    parsedId
      ? API_ROUTES.productionOrders.base +
          `/${parsedId.productionOrderId}/production-order-lines`
      : null,
    () => productionOrdersService.fetchProductionOrderLines(parsedId!.productionOrderId),
  );

  if (!parsedId || error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Dòng lệnh sản xuất"
          onClose={onClose}
        />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy dòng lệnh sản xuất.
        </div>
      </div>
    );
  }

  if (!data) {
    return <ProductionOrderLineDetailSkeleton />;
  }

  const line = data[parsedId.lineIndex];

  if (!line) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Dòng lệnh sản xuất"
          subtitle={`Mã lệnh sản xuất ${parsedId.productionOrderId}`}
          onClose={onClose}
        />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy dòng lệnh sản xuất.
        </div>
      </div>
    );
  }

  const additionalFields = Object.entries(line).filter(([key, value]) => {
    if (HANDLED_FIELDS.has(key)) {
      return false;
    }

    return formatPrimitiveValue(value) !== "";
  });

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Dòng lệnh sản xuất #${parsedId.lineIndex + 1}`}
        subtitle={line.ItemName ? formatText(line.ItemName) : undefined}
        onClose={onClose}
      />

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={parsedId.productionOrderId}
        />
        <FieldDisplay
          lable="Số dòng"
          value={formatText(line.LineNumber ?? parsedId.lineIndex + 1)}
        />
        <FieldDisplay
          lable="Giai đoạn"
          value={formatText(getProductionOrderLineStage(line))}
        />
        <FieldDisplay lable="Mã hàng" value={formatText(line.ItemNo)} />
        <FieldDisplay lable="Tên hàng" value={formatText(line.ItemName)} />
        <FieldDisplay lable="Số lô" value={formatText(line.U_SL)} />
        <FieldDisplay lable="Hạn dùng" value={formatDate(line.U_HSD)} />
        <FieldDisplay lable="Kho" value={formatText(line.Warehouse)} />
        <FieldDisplay
          lable="Số lượng yêu cầu"
          value={formatNumber(line.PlannedQuantity)}
        />
        <FieldDisplay
          lable="Số lượng đã xuất"
          value={formatNumber(line.IssuedQuantity)}
        />
        <FieldDisplay lable="Số lượng còn lại" value={getRemainingQuantity(line)} />
        <FieldDisplay
          lable="Đơn vị tính"
          value={formatText(getProductionOrderLineUnit(line))}
        />

        {additionalFields.length > 0 ? (
          <div className="mt-2 border-t border-gray-200 pt-4">
            <h2 className="mb-3 text-left text-base font-semibold text-gray-700">
              Thông tin bổ sung
            </h2>
            <div className="flex flex-col gap-4">
              {additionalFields.map(([key, value]) => (
                <FieldDisplay
                  key={key}
                  lable={key}
                  value={formatPrimitiveValue(value)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
