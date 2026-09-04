"use client";

import * as React from "react";
import {
  CalendarCheck,
  Check,
  FileText,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
import OpenFormButton from "@/components/button-open-form/button-open-form";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderDateCheck } from "../../types";
import AddDateCheckImagesForm from "./add-date-check-images-form";
import {
  PACKAGE_TYPE_OPTIONS,
  formatApprovalStatus,
  formatDateTime,
  formatPackageType,
  formatText,
  getFileNameFromPath,
  getUserLabel,
} from "../../utils";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const getStatusClassName = (status: string | null | undefined) => {
  if (status === "approved") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

function DateCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-36" />
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

function AuthenticatedDateCheckImage({
  imagePath,
  imageLabel,
}: {
  imagePath?: string | null;
  imageLabel: string;
}) {
  if (!imagePath) {
    return (
      <div className="flex h-40 items-center justify-center bg-gray-100 p-3 text-center text-xs text-gray-500">
        Không có đường dẫn ảnh.
      </div>
    );
  }

  return (
    <AuthenticatedImage
      src={imagePath}
      alt={imageLabel}
      className="h-40 w-full rounded-none border-0"
      height={160}
      width={240}
      loading="lazy"
      objectFit="contain"
    />
  );
}

function EditDateCheckForm({
  checkId,
  initialPackageType,
  onSaved,
  onClose,
}: {
  checkId: string | number;
  initialPackageType?: string | null;
  onSaved: () => Promise<void>;
  onClose?: () => void;
}) {
  const [packageType, setPackageType] = React.useState(
    initialPackageType ?? "goi",
  );
  const [requestFile, setRequestFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("package_type", packageType);

    if (requestFile) {
      formData.append("request_file", requestFile);
    }

    try {
      setIsSubmitting(true);
      await productionOrdersService.updateDateCheck(checkId, formData);
      toast.success("Đã cập nhật phiếu kiểm tra date.");
      setRequestFile(null);
      await onSaved();
      onClose?.();
    } catch (updateError: any) {
      toast.error(
        getErrorMessage(updateError, "Không thể cập nhật phiếu kiểm tra date."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[260px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[228px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Sửa phiếu kiểm tra date
          </p>

          <div className="space-y-2">
            <Label>Loại bao bì</Label>
            <Select
              value={packageType}
              disabled={isSubmitting}
              onValueChange={setPackageType}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn loại bao bì" />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date-check-request-file">
              File yêu cầu mới
            </Label>
            <Input
              id="edit-date-check-request-file"
              type="file"
              disabled={isSubmitting}
              onChange={(event) =>
                setRequestFile(event.target.files?.[0] ?? null)
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              setPackageType(initialPackageType ?? "goi");
              setRequestFile(null);
            }}
          >
            Đặt lại
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function DateCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [openingFilePath, setOpeningFilePath] = React.useState<string | null>(
    null,
  );

  const detailKey = API_ROUTES.productionOrders.dateCheckDetail(id);
  const { data, error, mutate } = useSWR<ProductionOrderDateCheck>(
    detailKey,
    () => productionOrdersService.fetchDateCheckById(id),
  );
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.dateChecks(data.production_order_id)
    : null;
  const isPending = data?.approval_status === "pending";

  const refresh = async () => {
    await mutate();
    if (listKey) {
      await mutateGlobal(listKey);
    }
  };

  const handleApproval = async (approvalStatus: "approved" | "rejected") => {
    const message =
      approvalStatus === "approved"
        ? "Duyệt phiếu kiểm tra date này?"
        : "Từ chối phiếu kiểm tra date này?";

    if (!window.confirm(message)) {
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrdersService.updateDateCheckApproval(id, approvalStatus);
      toast.success(
        approvalStatus === "approved"
          ? "Đã duyệt phiếu kiểm tra date."
          : "Đã từ chối phiếu kiểm tra date.",
      );
      await refresh();
    } catch (approvalError: any) {
      toast.error(
        getErrorMessage(approvalError, "Không thể cập nhật trạng thái duyệt."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCheck = async () => {
    if (!window.confirm("Xóa phiếu kiểm tra date này?")) {
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrdersService.deleteDateCheck(id);
      toast.success("Đã xóa phiếu kiểm tra date.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa phiếu kiểm tra date."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteImage = async (imageId: string | number | undefined) => {
    if (imageId === undefined || imageId === null) {
      return;
    }

    if (!window.confirm("Xóa ảnh kiểm tra này?")) {
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrdersService.deleteDateCheckImage(imageId);
      toast.success("Đã xóa ảnh kiểm tra.");
      await refresh();
    } catch (imageError: any) {
      toast.error(getErrorMessage(imageError, "Không thể xóa ảnh."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRequestFile = async (filePath: string) => {
    const fileWindow = window.open("about:blank", "_blank");

    if (!fileWindow) {
      toast.error("TrÃ¬nh duyá»‡t Ä‘ang cháº·n tab má»›i.");
      return;
    }

    fileWindow.opener = null;
    fileWindow.document.write("Äang táº£i file...");

    try {
      setOpeningFilePath(filePath);
      const response = await productionOrdersService.fetchAuthenticatedAsset(
        filePath,
        {
          original: true,
        },
      );
      const fileUrl = window.URL.createObjectURL(response.data);

      fileWindow.location.href = fileUrl;
      window.setTimeout(() => {
        window.URL.revokeObjectURL(fileUrl);
      }, 60_000);
    } catch (fileError: any) {
      fileWindow.close();
      toast.error(
        getErrorMessage(fileError, "KhÃ´ng thá»ƒ má»Ÿ file yÃªu cáº§u."),
      );
    } finally {
      setOpeningFilePath(null);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Kiểm tra date" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy phiếu kiểm tra date.
        </div>
      </div>
    );
  }

  if (!data) {
    return <DateCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Kiểm tra date #${data.id}`}
        subtitle={formatDateTime(data.checked_at)}
        actions={
          isPending ? (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              disabled={isSubmitting}
              onClick={handleDeleteCheck}
              aria-label="Xóa phiếu kiểm tra date"
              title="Xóa"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null
        }
        onClose={onClose}
      />

      {isPending ? (
        <div className="mt-4 rounded border bg-gray-50 p-3 text-left">
          <div className="mb-2 text-sm font-semibold text-gray-700">
            Thao tác
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <OpenFormButton
              icon={<CalendarCheck />}
              name="Sửa"
              form={
                <EditDateCheckForm
                  checkId={id}
                  initialPackageType={data.package_type}
                  onSaved={refresh}
                />
              }
            />
            <OpenFormButton
              icon={<ImagePlus />}
              name="Thêm ảnh"
              form={<AddDateCheckImagesForm checkId={id} onSaved={refresh} />}
            />
            <div className="inline-flex flex-col items-center p-0.5 md:p-1">
              <button
                type="button"
                title="Duyệt"
                disabled={isSubmitting}
                onClick={() => handleApproval("approved")}
                className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-green-500 px-3 py-2 text-center text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
              >
                <Check />
              </button>
              <div className="w-[82px] md:w-[90px]">
                <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                  Duyệt
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay
          lable="Loại bao bì"
          value={formatPackageType(data.package_type)}
        />
        <div className="flex w-full justify-start gap-4">
          <div className="m-1 min-w-[150px] max-w-[200px] pr-2 text-left font-semibold text-gray-600 wrap-anywhere">
            Trạng thái duyệt
          </div>
          <div className="flex-1 text-left text-gray-800">
            <Badge
              variant="outline"
              className={getStatusClassName(data.approval_status)}
            >
              {formatApprovalStatus(data.approval_status)}
            </Badge>
          </div>
        </div>
        <div className="flex w-full justify-start gap-4">
          <div className="m-1 min-w-[150px] max-w-[200px] pr-2 text-left font-semibold text-gray-600 wrap-anywhere">
            File yêu cầu
          </div>
          <div className="flex-1 text-left text-gray-800">
            {data.request_file_path ? (
              <button
                type="button"
                disabled={openingFilePath === data.request_file_path}
                onClick={() => handleOpenRequestFile(data.request_file_path!)}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
              >
                <FileText className="size-4" />
                {openingFilePath === data.request_file_path
                  ? "Äang má»Ÿ file..."
                  : getFileNameFromPath(data.request_file_path)}
              </button>
            ) : (
              <span className="text-sm text-gray-500">Không có</span>
            )}
          </div>
        </div>

        <div className="flex w-full justify-start gap-4">
          <div className="m-1 min-w-[150px] max-w-[200px] pr-2 text-left font-semibold text-gray-600 wrap-anywhere">
            Ảnh kiểm tra
          </div>
          <div className="flex-1 text-left text-gray-800">
            {/*
            false ? (
              <div className="mb-3">
                <OpenFormButton
                  icon={<ImagePlus />}
                  name="Thêm ảnh"
                  form={
                    <AddDateCheckImagesForm
                      checkId={id}
                      onSaved={refresh}
                    />
                  }
                />
              </div>
            ) : null
            */}

            {data.images && data.images.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.images.map((image, index) => {
                  const imageLabel =
                    getFileNameFromPath(image.image_path) ||
                    `Ảnh kiểm tra ${index + 1}`;

                  return (
                    <div
                      key={image.id ?? image.image_path ?? index}
                      className="relative overflow-hidden rounded border bg-gray-50 text-sm text-gray-700"
                    >
                      {isPending ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          disabled={isSubmitting}
                          className="absolute right-2 top-2 z-10 h-8 w-8"
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                      <AuthenticatedDateCheckImage
                        imagePath={image.image_path}
                        imageLabel={imageLabel}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-dashed p-4 text-center text-sm text-gray-500">
                Chưa có ảnh kiểm tra.
              </div>
            )}
          </div>
        </div>

        <FieldDisplay
          lable="Thời điểm kiểm tra"
          value={formatDateTime(data.checked_at)}
        />
        <FieldDisplay
          lable="Thời điểm duyệt"
          value={formatDateTime(data.approved_at)}
        />
        <FieldDisplay lable="Người tạo" value={getUserLabel(data.createdBy)} />
        <FieldDisplay
          lable="Người duyệt"
          value={getUserLabel(data.approvedBy)}
        />
      </div>
    </div>
  );
}
