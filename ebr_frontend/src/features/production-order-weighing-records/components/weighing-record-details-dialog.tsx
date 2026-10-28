"use client";

import { useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { isAxiosError } from "axios";
import { Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import userService from "@/services/user.service";
import useUserStore from "@/store/user.store";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import service from "@/services/production-order-weighing-records.service";
import type {
  ProductionOrderWeighingRecordDetail,
  ProductionOrderWeighingRecordLine,
} from "../types";
import { formatWeight, normalizeWeight, sumWeights } from "../weight-utils";

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

export default function WeighingRecordDetailsDialog({
  recordId,
  line,
  locked,
  open,
  onOpenChange,
}: {
  recordId: number;
  line: ProductionOrderWeighingRecordLine;
  locked: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutate: mutateGlobal } = useSWRConfig();
  const userId = useUserStore((state) => state.user?.id);
  const { data: permissions, error: permissionsError } = useSWR(
    open && userId ? [API_ROUTES.users.myPermissions, userId] : null,
    () => userService.fetchMyPermissions(),
  );
  const canEdit =
    !locked &&
    !permissionsError &&
    Boolean(permissions?.permissionKeys.includes("production-orders.update"));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const busyRef = useRef(false);
  const {
    data: details,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    open
      ? `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${line.id}/details`
      : null,
    () => service.fetchWeighingDetails(recordId, line.id),
    { fallbackData: line.details },
  );
  const errorDetail: unknown = isAxiosError(error)
    ? error.response?.data?.message
    : null;
  const weightsByUnit = new Map<string, string[]>();
  for (const detail of details ?? []) {
    const weights = weightsByUnit.get(detail.unit) ?? [];
    weights.push(detail.net_weight);
    weightsByUnit.set(detail.unit, weights);
  }

  const save = async (detail: ProductionOrderWeighingRecordDetail) => {
    if (busyRef.current || !canEdit) return;
    const normalized = normalizeWeight(weight, true);
    if (!normalized) {
      setSaveError(
        "Nhập khối lượng khác 0 (có thể âm), tối đa 12 chữ số nguyên và 6 chữ số thập phân.",
      );
      return;
    }
    busyRef.current = true;
    setIsSaving(true);
    setSaveError("");
    try {
      const updated = await service.updateWeighingDetail(
        recordId,
        line.id,
        detail.id,
        {
          ...(normalized !== normalizeWeight(detail.net_weight, true)
            ? { net_weight: normalized }
            : {}),
          note: note.trim() || null,
        },
      );
      await mutate(
        (current) =>
          current?.map((entry) => (entry.id === updated.id ? updated : entry)),
        { revalidate: false },
      );
      const linesKey = `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines`;
      await mutateGlobal<ProductionOrderWeighingRecordLine[]>(
        linesKey,
        (current) =>
          current?.map((entry) =>
            entry.id === line.id
              ? {
                  ...entry,
                  details: entry.details?.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                }
              : entry,
          ),
        { revalidate: false },
      );
      setEditingId(null);
      toast.success("Đã cập nhật lần cân.");
      void mutate().catch(() => undefined);
      void mutateGlobal(linesKey).catch(() => undefined);
    } catch (error) {
      const message: unknown = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setSaveError(
        typeof message === "string"
          ? message
          : "Không thể cập nhật lần cân. Vui lòng thử lại.",
      );
    } finally {
      busyRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (busyRef.current) return;
          setEditingId(null);
          setSaveError("");
          onOpenChange(next);
        }}
      >
        <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden font-sans sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Chi tiết các lần cân</DialogTitle>
            <DialogDescription>
              {line.item_code} — {line.item_name}
              {line.lot_no ? ` · Lô ${line.lot_no}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-auto pr-1">
            {saveError ? (
              <p role="alert" className="text-sm text-red-600">
                {saveError}
              </p>
            ) : null}
            {error ? (
              <div
                role="alert"
                className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <p>
                  {typeof errorDetail === "string"
                    ? errorDetail
                    : "Không thể tải chi tiết các lần cân."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => void mutate().catch(() => undefined)}
                >
                  Thử lại
                </Button>
              </div>
            ) : null}
            {isLoading && !details ? (
              <div
                role="status"
                aria-label="Đang tải chi tiết cân"
                className="flex justify-center py-8"
              >
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : details?.length ? (
              <>
                {isValidating ? (
                  <p className="text-xs text-slate-500">Đang cập nhật...</p>
                ) : null}
                <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
                  <caption className="sr-only">
                    Chi tiết từng lần cân của {line.item_code}
                  </caption>
                  <colgroup>
                    <col className="w-[60px]" />
                    <col className="w-[125px]" />
                    <col className="w-[65px]" />
                    <col />
                    <col className="w-[140px]" />
                    <col className="w-[140px]" />
                    <col className="w-[165px]" />
                    {canEdit ? <col className="w-[120px]" /> : null}
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-slate-100">
                    <tr>
                      {[
                        "Lần cân",
                        "Khối lượng",
                        "Đơn vị",
                        "Ghi chú",
                        "Hình ảnh",
                        "Người cân",
                        "Thời điểm cân",
                        ...(canEdit ? ["Thao tác"] : []),
                      ].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="border border-slate-300 px-3 py-3 text-center font-semibold"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...details]
                      .sort((a, b) => a.id - b.id)
                      .map((detail, index) => (
                        <tr
                          key={detail.id}
                          className="align-top even:bg-slate-50"
                        >
                          <th
                            scope="row"
                            className="border border-slate-300 px-3 py-3 text-center font-medium"
                          >
                            {index + 1}
                          </th>
                          <td className="border border-slate-300 px-3 py-3 text-right font-medium tabular-nums">
                            {canEdit && editingId === detail.id ? (
                              <Input
                                autoFocus
                                aria-label={`Khối lượng lần cân ${index + 1}`}
                                inputMode="decimal"
                                maxLength={20}
                                value={weight}
                                disabled={isSaving}
                                onChange={(event) => {
                                  setWeight(event.target.value);
                                  setSaveError("");
                                }}
                              />
                            ) : (
                              formatWeight(detail.net_weight)
                            )}
                          </td>
                          <td className="break-words border border-slate-300 px-3 py-3 text-center">
                            {detail.unit}
                          </td>
                          <td className="whitespace-pre-wrap break-words border border-slate-300 px-3 py-3">
                            {canEdit && editingId === detail.id ? (
                              <Textarea
                                aria-label={`Ghi chú lần cân ${index + 1}`}
                                value={note}
                                disabled={isSaving}
                                onChange={(event) =>
                                  setNote(event.target.value)
                                }
                              />
                            ) : (
                              detail.note || "—"
                            )}
                          </td>
                          <td className="border border-slate-300 px-3 py-3">
                            {detail.images?.length || detail.image_path ? (
                              <div className="flex flex-col gap-2">
                                {(detail.images?.length
                                  ? detail.images
                                  : [{ id: 0, image_path: detail.image_path! }]
                                ).map((image) => (
                                  <AuthenticatedImage
                                    key={image.id}
                                    src={image.image_path}
                                    alt={`Ảnh lần cân ${index + 1} của ${line.item_code}`}
                                    previewTitle={`Lần cân ${index + 1} — ${line.item_code}`}
                                    width={140}
                                    height={100}
                                    className="h-24 w-full rounded border"
                                    objectFit="contain"
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500">
                                Chưa có ảnh
                              </span>
                            )}
                          </td>
                          <td className="break-words border border-slate-300 px-3 py-3">
                            {detail.weighedBy?.name ||
                              detail.weighedBy?.username ||
                              "—"}
                          </td>
                          <td className="border border-slate-300 px-3 py-3">
                            {formatTime(detail.weighed_at)}
                          </td>
                          {canEdit ? (
                            <td className="border border-slate-300 px-3 py-3">
                              {editingId === detail.id ? (
                                <div className="flex flex-col gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isSaving || !weight.trim()}
                                    onClick={() => void save(detail)}
                                  >
                                    {isSaving ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : null}
                                    Lưu
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isSaving}
                                    onClick={() => {
                                      setEditingId(null);
                                      setSaveError("");
                                    }}
                                  >
                                    Hủy
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isSaving}
                                  aria-label={`Sửa lần cân ${index + 1}`}
                                  onClick={() => {
                                    setEditingId(detail.id);
                                    setWeight(detail.net_weight);
                                    setNote(detail.note ?? "");
                                    setSaveError("");
                                  }}
                                >
                                  <Edit2 className="size-4" />
                                  Sửa
                                </Button>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-semibold">
                    <tr>
                      <td
                        colSpan={canEdit ? 8 : 7}
                        className="border border-slate-300 px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span>Tổng khối lượng</span>
                          <div className="text-right tabular-nums">
                            {[...weightsByUnit].map(([unit, weights]) => (
                              <p key={unit}>
                                {formatWeight(sumWeights(weights))} {unit}
                              </p>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            ) : !error && !isLoading ? (
              <p className="rounded border border-dashed p-6 text-center text-sm text-slate-500">
                Nguyên liệu này chưa có lần cân nào.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                setEditingId(null);
                setSaveError("");
                onOpenChange(false);
              }}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
