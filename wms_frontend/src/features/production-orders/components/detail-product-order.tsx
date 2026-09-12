"use client";

import OpenFormButton from "@/components/button-open-form/button-open-form";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import { isProductionOrderFeatureEnabled } from "@/features/features";
import { ProductionGuideStatus } from "@/features/production-order-production-guide";
import { FormProductionOrderSamplingRecord } from "@/features/production-order-sampling-records";
import { FlaskConical } from "lucide-react";

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("vi-VN");
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN");
};

const formatProductionOrderStatus = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const statusLabels: Record<string, string> = {
    boposPlanned: "Đã lên kế hoạch",
    boppPlanned: "Đã lên kế hoạch",
    Planned: "Đã lên kế hoạch",
    P: "Đã lên kế hoạch",
    boposReleased: "Đã phát hành",
    boppReleased: "Đã phát hành",
    Released: "Đã phát hành",
    R: "Đã phát hành",
    boposClosed: "Đã đóng",
    boppClosed: "Đã đóng",
    Closed: "Đã đóng",
    L: "Đã đóng",
    boposCancelled: "Đã hủy",
    boppCancelled: "Đã hủy",
    Cancelled: "Đã hủy",
    C: "Đã hủy",
  };

  const key = String(value);

  return statusLabels[key] ?? key;
};

const formatProductionOrderType = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const typeLabels: Record<string, string> = {
    bopotStandard: "Tiêu chuẩn",
    Standard: "Tiêu chuẩn",
    S: "Tiêu chuẩn",
    bopotSpecial: "Đặc biệt",
    Special: "Đặc biệt",
    P: "Đặc biệt",
    bopotDisassembly: "Tháo rã",
    Disassembly: "Tháo rã",
    D: "Tháo rã",
  };

  const key = String(value);

  return typeLabels[key] ?? key;
};

function ProductOrderDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="mx-auto h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SamplingRequestStatus({
  samplingRequest,
}: {
  samplingRequest?: {
    isSent?: boolean;
    googleDocUrl?: string | null;
  } | null;
}) {
  const label = samplingRequest?.isSent ? "Đã gửi" : "Chưa gửi";

  return (
    <div className="flex w-full justify-start gap-3 md:gap-4">
      <div className="m-0.5 w-[170px] shrink-0 pr-1 text-left font-semibold text-gray-600 wrap-anywhere md:m-1 md:w-[220px] md:pr-2">
        Gửi PYCLM
      </div>
      <div className="min-w-0 flex-1 text-left text-gray-800">
        <div className="flex items-center gap-2">
          <span
            className={`size-4 rounded-full ${
              samplingRequest?.isSent ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {samplingRequest?.googleDocUrl ? (
            <a
              href={samplingRequest.googleDocUrl}
              target="_blank"
              rel="noreferrer"
              className="text-gray-800 hover:text-blue-600 hover:underline"
            >
              {label}
            </a>
          ) : (
            <span className="text-gray-800">{label}</span>
          )}
        </div>
      </div>
    </div>
  );
}

type ProductionOrderDocumentControlUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type ProductionOrderDocumentControl = {
  production_order_id?: string | number | null;
  batch_record_issued_at?: string | null;
  batchRecordIssuedBy?: ProductionOrderDocumentControlUser | null;
  batch_record_received_at?: string | null;
  batchRecordReceivedBy?: ProductionOrderDocumentControlUser | null;
  test_certificate_received_at?: string | null;
  testCertificateReceivedBy?: ProductionOrderDocumentControlUser | null;
  warehouse_release_received_at?: string | null;
  warehouseReleaseReceivedBy?: ProductionOrderDocumentControlUser | null;
};

const getDocumentControlUserLabel = (
  user: ProductionOrderDocumentControlUser | null | undefined,
) => user?.name ?? user?.username ?? user?.email ?? "";

const getDocumentControlStatusText = (
  completedAt: string | null | undefined,
  completedBy: ProductionOrderDocumentControlUser | null | undefined,
) => {
  if (!completedAt) {
    return "Chưa thực hiện";
  }

  const userLabel = getDocumentControlUserLabel(completedBy);

  return [formatDateTime(completedAt), userLabel && `- ${userLabel}`]
    .filter(Boolean)
    .join(" ");
};

function ProductionOrderDocumentControlStatus({
  documentControl,
}: {
  documentControl?: ProductionOrderDocumentControl | null;
}) {
  return (
    <>
      <FieldDisplay
        lable="Cấp hồ sơ lô giấy"
        value={getDocumentControlStatusText(
          documentControl?.batch_record_issued_at,
          documentControl?.batchRecordIssuedBy,
        )}
      />
      <FieldDisplay
        lable="Nhận hồ sơ lô giấy"
        value={getDocumentControlStatusText(
          documentControl?.batch_record_received_at,
          documentControl?.batchRecordReceivedBy,
        )}
      />
      <FieldDisplay
        lable="Nhận phiếu xuất kho"
        value={getDocumentControlStatusText(
          documentControl?.warehouse_release_received_at,
          documentControl?.warehouseReleaseReceivedBy,
        )}
      />
      <FieldDisplay
        lable="Nhận phiếu kiểm nghiệm"
        value={getDocumentControlStatusText(
          documentControl?.test_certificate_received_at,
          documentControl?.testCertificateReceivedBy,
        )}
      />
    </>
  );
}

export default function ProductOrderDetail({ productOrder }: { productOrder: any }) {
  if (!productOrder) {
    return <ProductOrderDetailSkeleton />;
  }

  const itemName = productOrder.item?.item_name ?? "";
  const registrationNumber =
    productOrder.item?.registration?.registration_number ?? "";
  const productionOrderId =
    productOrder.id ??
    productOrder.production_order_id ??
    productOrder.DocumentAbsoluteEntry;
  const featureConfig = productOrder.featureConfig;
  const isActionEnabled = (key: string) =>
    isProductionOrderFeatureEnabled(featureConfig, "action", key);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-2 md:gap-4">
      <div className="flex flex-col gap-4 rounded border bg-white p-3 text-center shadow-md md:gap-8 md:p-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
          <h1 className="break-words text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
            {itemName}
          </h1>
          <span className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
            -
          </span>
          <p className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
            {productOrder.lot_no}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {isActionEnabled("create_sampling_record") && (
            <OpenFormButton
              icon={<FlaskConical />}
              name="Lấy mẫu"
              form={
                <FormProductionOrderSamplingRecord
                  productionOrderId={productionOrderId}
                />
              }
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border bg-white p-3 text-center shadow-md md:gap-4 md:p-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={productOrder.production_order_code}
        />
        <FieldDisplay lable="Mã sản phẩm" value={productOrder.item_code} />
        <FieldDisplay
          lable="Trạng thái"
          value={formatProductionOrderStatus(productOrder.status)}
        />
        <FieldDisplay
          lable="Loại"
          value={formatProductionOrderType(productOrder.type)}
        />
        <FieldDisplay
          lable="Số lượng kế hoạch"
          value={`${formatNumber(productOrder.planned_quatity)} ${productOrder.unit ?? ""}`}
        />
        <FieldDisplay lable="Kho" value={productOrder.warehouse} />
        <FieldDisplay
          lable="Ngày tạo"
          value={formatDate(productOrder.creation_date)}
        />
        <FieldDisplay
          lable="Ngày bắt đầu"
          value={formatDate(productOrder.start_date)}
        />
        <FieldDisplay
          lable="Ngày sản xuất"
          value={formatDate(productOrder.date_manufacture)}
        />
        <FieldDisplay
          lable="Hạn sử dụng"
          value={formatDate(productOrder.expire_date)}
        />
        <FieldDisplay
          lable="Quy cách đóng gói"
          value={productOrder.packing_specification ?? ""}
        />
        <FieldDisplay lable="Ghi chú" value={productOrder.remarks ?? ""} />
        <FieldDisplay
          lable="Nội dung thay đổi"
          value={productOrder.change_content ?? ""}
        />
        <FieldDisplay lable="Số đăng ký" value={registrationNumber} />
        <SamplingRequestStatus samplingRequest={productOrder.pyclm} />
        {productionOrderId !== null && productionOrderId !== undefined ? (
          <ProductionGuideStatus productionOrderId={productionOrderId} />
        ) : null}
        <ProductionOrderDocumentControlStatus
          documentControl={productOrder.documentControl}
        />
      </div>
    </div>
  );
}
