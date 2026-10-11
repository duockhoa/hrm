"use client";

import OpenFormButton from "@/components/button-open-form/button-open-form";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import FormCreateSamplingRequest from "@/components/form-create-sampling-request/form-create-sampling-request";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import useUserStore from "@/store/user.store";
import userService from "@/services/user.service";
import productionOrdersService from "@/services/product-orders.service";
import { Pencil, Trash2 } from "lucide-react";
import { LuFileInput } from "react-icons/lu";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
import FormEditFinishedProductSummary from "../form-edit-finished-product-summary/form-edit-finished-product-summary";

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
  const { data: permissions, error: permissionsError } = useSWR(
    userId ? [API_ROUTES.users.myPermissions, userId] : null,
    () => userService.fetchMyPermissions(),
  );
  const canSendSamplingRequest = Boolean(
    !permissionsError &&
      permissions?.permissionKeys.includes("production-orders.sampling-requests.send"),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { data, error, mutate } = useSWR<FinishedProductSummary>(
    API_ROUTES.productionOrders.finishedProductSummaryDetail(id),
    () => productionOrdersService.fetchFinishedProductSummaryById(id),
  );

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
  const pyclm = productionOrder?.pyclm;
  const userLabel =
    createdBy?.name ?? createdBy?.username ?? createdBy?.email ?? "";
  const pyclmSenderLabel =
    pyclm?.sender?.name ??
    pyclm?.sender?.username ??
    pyclm?.sender?.email ??
    "";
  const summaryId = data.id;
  const productionOrderSummaryKey =
    productionOrderId !== null && productionOrderId !== undefined
      ? API_ROUTES.productionOrders.finishedProductSummary(productionOrderId)
      : null;

  const refreshRelatedSummaries = async () => {
    await Promise.all([
      mutate(),
      mutateGlobal(API_ROUTES.productionOrders.finishedProductSummaries),
      ...(productionOrderSummaryKey
        ? [mutateGlobal(productionOrderSummaryKey)]
        : []),
    ]);
  };

  const handleDelete = async () => {
    if (summaryId === null || summaryId === undefined) return;

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteFinishedProductSummary(summaryId);
      toast.success("Đã xóa tổng kết thành phẩm.");
      await Promise.all([
        mutateGlobal(API_ROUTES.productionOrders.finishedProductSummaries),
        ...(productionOrderSummaryKey
          ? [mutateGlobal(productionOrderSummaryKey)]
          : []),
      ]);
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ??
          "Không thể xóa tổng kết thành phẩm.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Tổng kết thành phẩm #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
            <Button size="sm" type="button" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Trash2 className="size-4" /> Xóa
            </Button>
          </>
        }
        onClose={onClose}
        showCloseButton={showCloseButton}
      />

      {summaryId !== null && summaryId !== undefined ? (
        <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="md:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cập nhật tổng kết thành phẩm</DialogTitle>
            </DialogHeader>
            <FormEditFinishedProductSummary
              summaryId={summaryId}
              data={data}
              onClose={() => setIsEditing(false)}
              onSaved={refreshRelatedSummaries}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog
        modal={false}
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tổng kết thành phẩm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi tổng kết thành phẩm này không?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isDeleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {canSendSamplingRequest && productionOrderId !== null && productionOrderId !== undefined ? (
        <div className="border-b py-3">
          <div className="flex flex-wrap justify-start gap-2">
            <OpenFormButton
              icon={<LuFileInput />}
              name="Tạo PYCLM"
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
          </div>
        </div>
      ) : null}

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
        <FieldDisplay lable="Số kiện" value={formatNumber(data.package_count)} />
        <FieldDisplay
          lable="Số hộp trên kiện"
          value={formatNumber(data.boxes_per_package)}
        />
        <FieldDisplay lable="Số hộp lẻ" value={formatNumber(data.loose_box_count)} />
        <FieldDisplay
          lable="Tổng số lượng"
          value={formatNumber(getTotalQuantity(data))}
        />
        <FieldDisplay lable="Ghi chú" value={formatText(data.note)} />
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
        <FieldDisplay
          lable="Chức vụ"
          value={formatText(createdBy?.position)}
        />
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
