"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import useSWR, { mutate as mutateGlobal } from "swr";
import {
  Activity,
  ClipboardCheck,
  ClipboardPen,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import { productionOrderDeviationsService } from "@/services/index.service";

type DeviationUser = {
  username?: string | null;
  name?: string | null;
  email?: string | null;
};

type DeviationImage =
  | string
  | {
      url?: string | null;
      path?: string | null;
      filename?: string | null;
      file_name?: string | null;
      name?: string | null;
    };

type ProductionOrderDeviation = {
  id?: number | string;
  production_order_id?: number | string | null;
  deviation_content?: string | null;
  handling_plan?: string | null;
  handling_result?: string | null;
  cause?: string | null;
  cause_classification?: string | null;
  affected_quantity?: string | number | null;
  affected_quantity_unit?: string | null;
  handled_quantity?: string | number | null;
  handled_quantity_unit?: string | null;
  destroyed_quantity?: string | number | null;
  destroyed_quantity_unit?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  reporter?: DeviationUser | null;
  approver?: DeviationUser | null;
  deviation_images?: DeviationImage[] | DeviationImage | null;
  deviation_image?: DeviationImage | null;
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

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const getUserLabel = (user: DeviationUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const formatQuantityWithUnit = (
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
) => [formatText(quantity), unit].filter(Boolean).join(" ");

const CAUSE_CLASSIFICATION_OPTIONS = [
  {
    value: "Con người",
    label: "Con người (Man)",
  },
  {
    value: "Máy móc/Thiết bị",
    label: "Máy móc/Thiết bị (Machine)",
  },
  {
    value: "Nguyên vật liệu",
    label: "Nguyên vật liệu (Material)",
  },
  {
    value: "Phương pháp/Quy trình",
    label: "Phương pháp/Quy trình (Method)",
  },
  {
    value: "Môi trường",
    label: "Môi trường (Environment)",
  },
];

const getDeviationImageFilename = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  try {
    const url = /^https?:\/\//i.test(value)
      ? new URL(value)
      : new URL(value, "http://localhost");
    const pathnameParts = url.pathname.split("/").filter(Boolean);

    return decodeURIComponent(pathnameParts[pathnameParts.length - 1] ?? "");
  } catch {
    const pathParts = value
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean);

    return decodeURIComponent(pathParts[pathParts.length - 1] ?? value);
  }
};

const normalizeImages = (data: ProductionOrderDeviation) => {
  const images = [
    ...(Array.isArray(data.deviation_images)
      ? data.deviation_images
      : data.deviation_images
        ? [data.deviation_images]
        : []),
    ...(data.deviation_image ? [data.deviation_image] : []),
  ];

  const normalizedImages = images
    .map((image) => {
      if (typeof image === "string") {
        return {
          label: image,
          filename: getDeviationImageFilename(image),
        };
      }

      const filename = image.filename ?? image.file_name ?? image.name ?? "";
      const imagePath = image.url ?? image.path ?? filename;
      const imageFilename = filename || getDeviationImageFilename(imagePath);

      return {
        label: imageFilename || imagePath || "Hình ảnh",
        filename: imageFilename,
      };
    })
    .filter((image) => image.label || image.filename);

  const seen = new Set<string>();

  return normalizedImages.filter((image) => {
    const key = image.filename || image.label;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

function DeviationImagePreview({
  filename,
  label,
}: {
  filename: string;
  label: string;
}) {
  const src = `${API_ROUTES.productionOrderDeviations.images}/${encodeURIComponent(filename)}`;

  return (
    <AuthenticatedImage
      src={src}
      alt={label}
      className="h-40 w-full rounded-none border-0"
      height={160}
      width={240}
      loading="lazy"
      objectFit="contain"
    />
  );
}

function ProductionOrderDeviationDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-36" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CauseForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderDeviation;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [cause, setCause] = useState(data.cause ?? "");
  const [causeClassification, setCauseClassification] = useState(
    data.cause_classification ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLegacyClassification = Boolean(
    causeClassification &&
      !CAUSE_CLASSIFICATION_OPTIONS.some(
        (option) => option.value === causeClassification,
      ),
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (data.id === undefined || data.id === null) {
      toast.error("Không tìm thấy mã sai lệch.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrderDeviationsService.updateProductionOrderDeviation(
        data.id,
        {
          cause: cause.trim() || null,
          cause_classification: causeClassification.trim() || null,
        },
      );
      toast.success("Đã cập nhật nguyên nhân sai lệch.");
      await onSaved();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật nguyên nhân sai lệch."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[300px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[268px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Nhập nguyên nhân
          </p>

          <div className="space-y-2">
            <Label htmlFor="deviation-cause">Nguyên nhân</Label>
            <Textarea
              id="deviation-cause"
              value={cause}
              disabled={isSubmitting}
              onChange={(event) => setCause(event.target.value)}
              placeholder="Nhập nguyên nhân sai lệch"
              className="min-h-28"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviation-cause-classification">
              Phân loại nguyên nhân
            </Label>
            <Select
              value={causeClassification}
              disabled={isSubmitting}
              onValueChange={setCauseClassification}
            >
              <SelectTrigger
                id="deviation-cause-classification"
                className="w-full"
              >
                <SelectValue placeholder="Chọn phân loại 4M 1E" />
              </SelectTrigger>
              <SelectContent>
                {hasLegacyClassification ? (
                  <SelectItem value={causeClassification}>
                    {causeClassification}
                  </SelectItem>
                ) : null}
                {CAUSE_CLASSIFICATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ImpactForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderDeviation;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [affectedQuantity, setAffectedQuantity] = useState(
    data.affected_quantity === null || data.affected_quantity === undefined
      ? ""
      : String(data.affected_quantity),
  );
  const [affectedQuantityUnit, setAffectedQuantityUnit] = useState(
    data.affected_quantity_unit ?? "",
  );
  const [handledQuantity, setHandledQuantity] = useState(
    data.handled_quantity === null || data.handled_quantity === undefined
      ? ""
      : String(data.handled_quantity),
  );
  const [handledQuantityUnit, setHandledQuantityUnit] = useState(
    data.handled_quantity_unit ?? "",
  );
  const [destroyedQuantity, setDestroyedQuantity] = useState(
    data.destroyed_quantity === null || data.destroyed_quantity === undefined
      ? ""
      : String(data.destroyed_quantity),
  );
  const [destroyedQuantityUnit, setDestroyedQuantityUnit] = useState(
    data.destroyed_quantity_unit ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (data.id === undefined || data.id === null) {
      toast.error("Không tìm thấy mã sai lệch.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrderDeviationsService.updateProductionOrderDeviation(
        data.id,
        {
          affected_quantity: affectedQuantity.trim() || null,
          affected_quantity_unit: affectedQuantityUnit.trim() || null,
          handled_quantity: handledQuantity.trim() || null,
          handled_quantity_unit: handledQuantityUnit.trim() || null,
          destroyed_quantity: destroyedQuantity.trim() || null,
          destroyed_quantity_unit: destroyedQuantityUnit.trim() || null,
        },
      );
      toast.success("Đã cập nhật mức độ ảnh hưởng.");
      await onSaved();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật mức độ ảnh hưởng."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[360px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[328px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Nhập mức độ ảnh hưởng
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="impact-affected-quantity">
                Số lượng ảnh hưởng
              </Label>
              <Input
                id="impact-affected-quantity"
                value={affectedQuantity}
                disabled={isSubmitting}
                onChange={(event) => setAffectedQuantity(event.target.value)}
                placeholder="VD: 12.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact-affected-unit">Đơn vị ảnh hưởng</Label>
              <Input
                id="impact-affected-unit"
                value={affectedQuantityUnit}
                disabled={isSubmitting}
                onChange={(event) =>
                  setAffectedQuantityUnit(event.target.value)
                }
                placeholder="VD: kg"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="impact-handled-quantity">Số lượng đã xử lý</Label>
              <Input
                id="impact-handled-quantity"
                value={handledQuantity}
                disabled={isSubmitting}
                onChange={(event) => setHandledQuantity(event.target.value)}
                placeholder="VD: 8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact-handled-unit">Đơn vị đã xử lý</Label>
              <Input
                id="impact-handled-unit"
                value={handledQuantityUnit}
                disabled={isSubmitting}
                onChange={(event) => setHandledQuantityUnit(event.target.value)}
                placeholder="VD: kg"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="impact-destroyed-quantity">Số lượng đã hủy</Label>
              <Input
                id="impact-destroyed-quantity"
                value={destroyedQuantity}
                disabled={isSubmitting}
                onChange={(event) => setDestroyedQuantity(event.target.value)}
                placeholder="VD: 4.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact-destroyed-unit">Đơn vị đã hủy</Label>
              <Input
                id="impact-destroyed-unit"
                value={destroyedQuantityUnit}
                disabled={isSubmitting}
                onChange={(event) =>
                  setDestroyedQuantityUnit(event.target.value)
                }
                placeholder="VD: kg"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function HandlingResultForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderDeviation;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [handlingResult, setHandlingResult] = useState(
    data.handling_result ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (data.id === undefined || data.id === null) {
      toast.error("Không tìm thấy mã sai lệch.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrderDeviationsService.updateProductionOrderDeviation(
        data.id,
        {
          handling_result: handlingResult.trim() || null,
        },
      );
      toast.success("Đã cập nhật kết quả xử lý.");
      await onSaved();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể cập nhật kết quả xử lý."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[280px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[248px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Nhập kết quả xử lý
          </p>

          <div className="space-y-2">
            <Label htmlFor="deviation-handling-result-quick">
              Kết quả xử lý
            </Label>
            <Textarea
              id="deviation-handling-result-quick"
              value={handlingResult}
              disabled={isSubmitting}
              onChange={(event) => setHandlingResult(event.target.value)}
              placeholder="Nhập kết quả xử lý"
              className="min-h-32 resize-y"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DeviationEditForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderDeviation;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [deviationContent, setDeviationContent] = useState(
    data.deviation_content ?? "",
  );
  const [handlingPlan, setHandlingPlan] = useState(data.handling_plan ?? "");
  const [handlingResult, setHandlingResult] = useState(
    data.handling_result ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (data.id === undefined || data.id === null) {
      toast.error("Không tìm thấy mã sai lệch.");
      return;
    }

    if (!deviationContent.trim()) {
      toast.error("Vui lòng nhập nội dung sai lệch.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrderDeviationsService.updateProductionOrderDeviation(
        data.id,
        {
          deviation_content: deviationContent.trim(),
          handling_plan: handlingPlan.trim() || null,
          handling_result: handlingResult.trim() || null,
        },
      );
      toast.success("Đã cập nhật sai lệch.");
      await onSaved();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể cập nhật sai lệch."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[420px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[388px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Sửa sai lệch
          </p>

          <div className="space-y-2">
            <Label htmlFor="deviation-content">Nội dung sai lệch</Label>
            <Textarea
              id="deviation-content"
              value={deviationContent}
              disabled={isSubmitting}
              onChange={(event) => setDeviationContent(event.target.value)}
              placeholder="Nhập nội dung sai lệch"
              className="min-h-24 resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviation-handling-plan">Phương án xử lý</Label>
            <Textarea
              id="deviation-handling-plan"
              value={handlingPlan}
              disabled={isSubmitting}
              onChange={(event) => setHandlingPlan(event.target.value)}
              placeholder="Nhập phương án xử lý"
              className="min-h-24 resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviation-handling-result">Kết quả xử lý</Label>
            <Textarea
              id="deviation-handling-result"
              value={handlingResult}
              disabled={isSubmitting}
              onChange={(event) => setHandlingResult(event.target.value)}
              placeholder="Nhập kết quả xử lý"
              className="min-h-20 resize-y"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ProductionOrderDeviationDetail({
  id,
  onClose,
  showCloseButton = true,
  externalActionsContainer,
}: {
  id: string | number;
  onClose: () => void;
  showCloseButton?: boolean;
  externalActionsContainer?: HTMLElement | null;
}) {
  const [isCauseFormOpen, setIsCauseFormOpen] = useState(false);
  const [isHandlingResultFormOpen, setIsHandlingResultFormOpen] =
    useState(false);
  const [isImpactFormOpen, setIsImpactFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const detailKey = `${API_ROUTES.productionOrderDeviations.base}/${id}`;
  const { data, error, mutate } = useSWR<ProductionOrderDeviation>(
    detailKey,
    () =>
      productionOrderDeviationsService.fetchProductionOrderDeviationById(id),
  );
  const refreshDeviationList = async (
    productionOrderId: ProductionOrderDeviation["production_order_id"],
  ) => {
    await Promise.all([
      mutateGlobal(API_ROUTES.productionOrderDeviations.base),
      productionOrderId !== null && productionOrderId !== undefined
        ? mutateGlobal(
            `${API_ROUTES.productionOrderDeviations.base}?production_order_id=${productionOrderId}`,
          )
        : Promise.resolve(),
    ]);
  };

  const handleDelete = async () => {
    if (data?.id === undefined || data.id === null) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrderDeviationsService.deleteProductionOrderDeviation(
        data.id,
      );
      toast.success("Đã xóa sai lệch.");
      await refreshDeviationList(data.production_order_id);
      onClose();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể xóa sai lệch."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Sai lệch"
          onClose={onClose}
          showCloseButton={showCloseButton}
        />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi sai lệch.
        </div>
      </div>
    );
  }

  if (!data) {
    return <ProductionOrderDeviationDetailSkeleton />;
  }

  const images = normalizeImages(data);
  const detailActions = (
    <>
      <Button
        size="sm"
        type="button"
        onClick={() => setIsEditFormOpen(true)}
      >
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
  );
  const usesExternalActions = externalActionsContainer !== undefined;

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      {usesExternalActions && externalActionsContainer
        ? createPortal(detailActions, externalActionsContainer)
        : null}
      <DetailPanelHeader
        title={`Sai lệch #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={usesExternalActions ? undefined : detailActions}
        onClose={onClose}
        showCloseButton={showCloseButton}
      />
      <div className="border-b py-3">
        <div className="flex flex-wrap justify-start gap-2">
          <div className="inline-flex flex-col items-center p-0.5 md:p-1">
            <button
              type="button"
              title="Nhập nguyên nhân"
              className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-center text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
              onClick={() => setIsCauseFormOpen(true)}
            >
              <ClipboardPen className="size-4" />
            </button>
            <div className="w-[82px] md:w-[90px]">
              <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                Nhập nguyên nhân
              </p>
            </div>
          </div>
          <div className="inline-flex flex-col items-center p-0.5 md:p-1">
            <button
              type="button"
              title="Nhập mức độ ảnh hưởng"
              className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-sky-500 px-3 py-2 text-center text-white hover:bg-sky-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
              onClick={() => setIsImpactFormOpen(true)}
            >
              <Activity className="size-4" />
            </button>
            <div className="w-[98px] md:w-[112px]">
              <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                Mức độ ảnh hưởng
              </p>
            </div>
          </div>
          <div className="inline-flex flex-col items-center p-0.5 md:p-1">
            <button
              type="button"
              title="Nhập kết quả xử lý"
              className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-emerald-500 px-3 py-2 text-center text-white hover:bg-emerald-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
              onClick={() => setIsHandlingResultFormOpen(true)}
            >
              <ClipboardCheck className="size-4" />
            </button>
            <div className="w-[98px] md:w-[112px]">
              <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                Kết quả xử lý
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        modal={false}
        open={isCauseFormOpen}
        onOpenChange={setIsCauseFormOpen}
      >
        <DialogContent className="md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Nhập nguyên nhân</DialogTitle>
          </DialogHeader>
          <CauseForm
            data={data}
            onCancel={() => setIsCauseFormOpen(false)}
            onSaved={async () => {
              await mutate();
              if (
                data.production_order_id !== null &&
                data.production_order_id !== undefined
              ) {
                await mutateGlobal(
                  `${API_ROUTES.productionOrderDeviations.base}?production_order_id=${data.production_order_id}`,
                );
              }
              setIsCauseFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={isHandlingResultFormOpen}
        onOpenChange={setIsHandlingResultFormOpen}
      >
        <DialogContent className="md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Nhập kết quả xử lý</DialogTitle>
          </DialogHeader>
          <HandlingResultForm
            data={data}
            onCancel={() => setIsHandlingResultFormOpen(false)}
            onSaved={async () => {
              await mutate();
              await refreshDeviationList(data.production_order_id);
              setIsHandlingResultFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={isImpactFormOpen}
        onOpenChange={setIsImpactFormOpen}
      >
        <DialogContent className="md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Nhập mức độ ảnh hưởng</DialogTitle>
          </DialogHeader>
          <ImpactForm
            data={data}
            onCancel={() => setIsImpactFormOpen(false)}
            onSaved={async () => {
              await mutate();
              await refreshDeviationList(data.production_order_id);
              setIsImpactFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
      >
        <DialogContent className="md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Sửa sai lệch</DialogTitle>
          </DialogHeader>
          <DeviationEditForm
            data={data}
            onCancel={() => setIsEditFormOpen(false)}
            onSaved={async () => {
              await mutate();
              await refreshDeviationList(data.production_order_id);
              setIsEditFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa sai lệch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi sai lệch này không?
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

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay
          lable="Nội dung sai lệch"
          value={formatText(data.deviation_content)}
        />
        <FieldDisplay
          lable="Phương án xử lý"
          value={formatText(data.handling_plan)}
        />
        <FieldDisplay
          lable="Kết quả xử lý"
          value={formatText(data.handling_result)}
        />
        <FieldDisplay lable="Nguyên nhân" value={formatText(data.cause)} />
        <FieldDisplay
          lable="Phân loại nguyên nhân"
          value={formatText(data.cause_classification)}
        />
        <FieldDisplay
          lable="Số lượng ảnh hưởng"
          value={formatQuantityWithUnit(
            data.affected_quantity,
            data.affected_quantity_unit,
          )}
        />
        <FieldDisplay
          lable="Số lượng đã xử lý"
          value={formatQuantityWithUnit(
            data.handled_quantity,
            data.handled_quantity_unit,
          )}
        />
        <FieldDisplay
          lable="Số lượng đã hủy"
          value={formatQuantityWithUnit(
            data.destroyed_quantity,
            data.destroyed_quantity_unit,
          )}
        />
        <FieldDisplay
          lable="Người báo cáo"
          value={getUserLabel(data.reporter)}
        />
        <FieldDisplay
          lable="Người phê duyệt"
          value={getUserLabel(data.approver)}
        />
        <FieldDisplay
          lable="Ngày tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay
          lable="Ngày cập nhật"
          value={formatDateTime(data.updated_at)}
        />

        {images.length > 0 ? (
          <div className="flex w-full justify-start gap-4">
            <div className="m-1 min-w-[150px] max-w-[200px] pr-2 text-left font-semibold text-gray-600 wrap-anywhere">
              Hình ảnh
            </div>
            <div className="grid flex-1 gap-3 text-left sm:grid-cols-2">
              {images.map((image, index) => (
                <div
                  key={`${image.label}-${index}`}
                  className="overflow-hidden rounded border bg-gray-50 text-sm text-gray-700"
                >
                  {image.filename ? (
                    <DeviationImagePreview
                      filename={image.filename}
                      label={image.label}
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-gray-100 p-3 text-center text-xs text-gray-500">
                      Không có đường dẫn ảnh.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
