"use client";

import OpenFormButton from "@/components/button-open-form/button-open-form";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { refreshItemCatalog } from "@/lib/item-catalog-refresh";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import EditHistoryButton from "@/features/edit-history/edit-history-button";
import { SUMMARY_HISTORY_FIELDS } from "@/features/edit-history/warehouse-history-fields";
import FieldDisplay from "@/components/field-display/field-display";
import FormCreateSamplingRequest from "@/components/form-create-sampling-request/form-create-sampling-request";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import useUserStore from "@/store/user.store";
import userService from "@/services/user.service";
import productionOrdersService from "@/services/product-orders.service";
import { LuFileInput } from "react-icons/lu";
import useSWR, { mutate as mutateGlobal } from "swr";

type FinishedProductSummaryUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type FinishedProductSummaryPyclm = {
  isSent?: boolean | null;
  status?: string | null;
  googleDocUrl?: string | null;
  sentAt?: string | null;
  location?: string | null;
  sender?: FinishedProductSummaryUser | null;
};

type FinishedProductSummaryOrder = {
  id?: number | string | null;
  item_code?: string | null;
  production_order_code?: string | null;
  lot_no?: string | null;
  date_manufacture?: string | null;
  expire_date?: string | null;
  item?: {
    item_code?: string | null;
    item_name?: string | null;
    unit?: string | null;
  } | null;
  pyclm?: FinishedProductSummaryPyclm | null;
};

type FinishedProductSummary = {
  id?: number | string;
  production_order_id?: number | string | null;
  package_count?: number | string | null;
  boxes_per_package?: number | string | null;
  loose_box_count?: number | string | null;
  note?: string | null;
  total_quantity?: number | string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  warehouse_confirmed_at?: string | null;
  warehouseConfirmedBy?: FinishedProductSummaryUser | null;
  productionOrder?: FinishedProductSummaryOrder | null;
  createdBy?: FinishedProductSummaryUser | null;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("vi-VN");
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

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN");
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const toNumber = (value: string | number | null | undefined) => {
  const numberValue = Number(value ?? 0);

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const getTotalQuantity = (summary: FinishedProductSummary) =>
  summary.total_quantity ??
  toNumber(summary.package_count) * toNumber(summary.boxes_per_package) +
    toNumber(summary.loose_box_count);

const isPyclmSent = (pyclm: FinishedProductSummaryPyclm | null | undefined) => {
  if (pyclm?.isSent !== null && pyclm?.isSent !== undefined) {
    return pyclm.isSent;
  }

  return ["sent", "done", "completed"].includes(
    pyclm?.status?.trim().toLowerCase() ?? "",
  );
};

function SamplingRequestStatus({
  samplingRequest,
}: {
  samplingRequest?: FinishedProductSummaryPyclm | null;
}) {
  const sent = isPyclmSent(samplingRequest);
  const label = sent ? "Đã gửi" : "Chưa gửi";

  return (
    <div className="flex w-full justify-start gap-3 md:gap-4">
      <div className="m-0.5 w-[170px] shrink-0 pr-1 text-left font-semibold text-gray-600 wrap-anywhere md:m-1 md:w-[220px] md:pr-2">
        Gửi PYCLM
      </div>
      <div className="min-w-0 flex-1 text-left text-gray-800">
        <div className="flex items-center gap-2">
          <span
            className={`size-4 shrink-0 rounded-full ${
              sent ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {samplingRequest?.googleDocUrl ? (
            <a
              href={samplingRequest.googleDocUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-600 hover:underline"
            >
              {label}
            </a>
          ) : (
            <span>{label}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FinishedProductSummaryDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-36" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FinishedProductSummaryDetail({
  id,
  onClose,
  showCloseButton = true,
}: {
  id: string | number;
  onClose: () => void;
  showCloseButton?: boolean;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const [confirming, setConfirming] = useState(false);
  const confirmingRef = useRef(false);
  const { data: permissions, error: permissionsError } = useSWR(
    userId ? [API_ROUTES.users.myPermissions, userId] : null,
    () => userService.fetchMyPermissions(),
  );
  const canSendSamplingRequest = Boolean(
    !permissionsError &&
    permissions?.permissionKeys.includes(
      "production-orders.sampling-requests.send",
    ),
  );
  const { data, error, mutate } = useSWR<FinishedProductSummary>(
    API_ROUTES.productionOrders.finishedProductSummaryDetail(id),
    () => productionOrdersService.fetchFinishedProductSummaryById(id),
  );
  const canConfirmWarehouse = Boolean(
    !permissionsError &&
    permissions?.permissionKeys.includes(
      "production-orders.finished-product-summaries.warehouse-confirm",
    ),
  );

  async function confirmWarehouse() {
    if (confirmingRef.current || data?.warehouse_confirmed_at) return;
    confirmingRef.current = true;
    setConfirming(true);
    try {
      const confirmed =
        await productionOrdersService.confirmFinishedProductSummaryWarehouse(
          id,
        );
      await mutate(confirmed, { revalidate: false });
      toast.success("Đã xác nhận tổng kết thành phẩm.");
      void refreshItemCatalog(
        API_ROUTES.productionOrders.finishedProductSummaries,
      ).catch(() => {});
    } catch {
      toast.error("Không thể xác nhận tổng kết thành phẩm. Vui lòng thử lại.");
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Tổng kết thành phẩm"
          onClose={onClose}
          showCloseButton={showCloseButton}
        />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy tổng kết thành phẩm.
        </div>
      </div>
    );
  }

  if (!data) {
    return <FinishedProductSummaryDetailSkeleton />;
  }

  const createdBy = data.createdBy;
  const productionOrder = data.productionOrder;
  const productionOrderId = productionOrder?.id ?? data.production_order_id;
  const showSamplingAction =
    canSendSamplingRequest && productionOrderId != null;
  const showWarehouseAction =
    canConfirmWarehouse && !data.warehouse_confirmed_at;
  const pyclm = productionOrder?.pyclm;
  const userLabel =
    createdBy?.name ?? createdBy?.username ?? createdBy?.email ?? "";
  const pyclmSenderLabel =
    pyclm?.sender?.name ??
    pyclm?.sender?.username ??
    pyclm?.sender?.email ??
    "";
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Tổng kết thành phẩm #${data.id}`}
        actions={
          <EditHistoryButton
            key={`summary-history-${id}`}
            historyUrl={`${API_ROUTES.productionOrders.finishedProductSummaryDetail(id)}/history`}
            title={`Tổng kết thành phẩm #${data.id}`}
            fields={SUMMARY_HISTORY_FIELDS}
          />
        }
        subtitle={formatDateTime(data.created_at)}
        onClose={onClose}
        showCloseButton={showCloseButton}
      />

      {(showSamplingAction || showWarehouseAction) && (
        <div className="flex flex-wrap items-start gap-2 border-b py-3">
          {showSamplingAction && (
            <OpenFormButton
              icon={<LuFileInput />}
              name="Soạn PYCLM"
              form={
                <FormCreateSamplingRequest
                  productionOrderId={productionOrderId}
                  onCreated={async () => {
                    await Promise.all([
                      mutate(),
                      mutateGlobal(
                        API_ROUTES.productionOrders.finishedProductSummaries,
                      ),
                    ]);
                  }}
                />
              }
            />
          )}
          {showWarehouseAction && (
            <button
              type="button"
              disabled={confirming}
              onClick={() => void confirmWarehouse()}
              className="group inline-flex cursor-pointer flex-col items-center p-0.5 disabled:cursor-default md:p-1"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white group-enabled:group-hover:bg-blue-600 md:h-10 md:w-10">
                {confirming ? (
                  <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                ) : (
                  <Check aria-hidden="true" className="size-5" />
                )}
              </span>
              <span className="mt-1 w-[68px] text-center text-[12px] font-semibold leading-tight text-gray-700 md:w-[90px] md:text-[14px]">
                {confirming ? "Đang xác nhận..." : "Nhân viên kho xác nhận"}
              </span>
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(
            productionOrder?.production_order_code ?? data.production_order_id,
          )}
        />
        <FieldDisplay
          lable="Mã sản phẩm"
          value={formatText(
            productionOrder?.item_code ?? productionOrder?.item?.item_code,
          )}
        />
        <FieldDisplay
          lable="Tên sản phẩm"
          value={formatText(productionOrder?.item?.item_name)}
        />
        <FieldDisplay
          lable="Số lô"
          value={formatText(productionOrder?.lot_no)}
        />
        <FieldDisplay
          lable="Ngày sản xuất"
          value={formatDate(productionOrder?.date_manufacture)}
        />
        <FieldDisplay
          lable="Hạn sử dụng"
          value={formatDate(productionOrder?.expire_date)}
        />
        <FieldDisplay
          lable="Số kiện"
          value={formatNumber(data.package_count)}
        />
        <FieldDisplay
          lable="Số hộp trên kiện"
          value={formatNumber(data.boxes_per_package)}
        />
        <FieldDisplay
          lable="Số hộp lẻ"
          value={formatNumber(data.loose_box_count)}
        />
        <FieldDisplay
          lable="Tổng số lượng"
          value={formatNumber(getTotalQuantity(data))}
        />
        <FieldDisplay lable="Ghi chú" value={formatText(data.note)} />
        <FieldDisplay
          lable="Xác nhận của kho"
          value={data.warehouse_confirmed_at ? "Đã xác nhận" : "Chưa xác nhận"}
        />
        <FieldDisplay
          lable="Nhân viên kho xác nhận"
          value={
            data.warehouseConfirmedBy?.name ||
            data.warehouseConfirmedBy?.username ||
            ""
          }
        />
        <FieldDisplay
          lable="Thời điểm kho xác nhận"
          value={formatDateTime(data.warehouse_confirmed_at)}
        />
        <SamplingRequestStatus samplingRequest={pyclm} />
        <FieldDisplay
          lable="Vị trí lấy mẫu"
          value={formatText(pyclm?.location)}
        />
        <FieldDisplay lable="Người gửi PYCLM" value={pyclmSenderLabel} />
        <FieldDisplay
          lable="Thời điểm gửi PYCLM"
          value={formatDateTime(pyclm?.sentAt)}
        />
        <FieldDisplay lable="Người nhập" value={userLabel} />
        <FieldDisplay
          lable="Bộ phận"
          value={formatText(createdBy?.department)}
        />
        <FieldDisplay lable="Chức vụ" value={formatText(createdBy?.position)} />
        <FieldDisplay lable="Email" value={formatText(createdBy?.email)} />
        <FieldDisplay
          lable="Ngày tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay
          lable="Ngày cập nhật"
          value={formatDateTime(data.updated_at)}
        />
      </div>
    </div>
  );
}
