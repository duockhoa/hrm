"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { isAxiosError } from "axios";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
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
import type { ProductionOrderWeighingRecordLine } from "../types";
import WeighingRecordWeightCell, {
  WeighingRecordWeightTotal,
} from "./weighing-record-weight-cell";
import WeighingRecordMaterialMenu from "./weighing-record-material-menu";
import WeighingRecordDetailMenu from "./weighing-record-detail-menu";
import WeighingRecordManualImport from "./weighing-record-manual-import";
import WeighingRecordLotCheckButton from "./weighing-record-lot-check";
import {
  formatWeight,
  getWeightStatus,
  groupRequiredQuantities,
  sumWeights,
} from "../weight-utils";
import { summarizeWeighings } from "../weighing-summary";

const compareMaterials = (
  a: ProductionOrderWeighingRecordLine,
  b: ProductionOrderWeighingRecordLine,
) =>
  a.item_code.localeCompare(b.item_code, "vi", { sensitivity: "base" }) ||
  a.id - b.id;

const message = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const value: unknown = error.response?.data?.message;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.join("; ");
  }
  return fallback;
};

const quantityLabel = (value: string) => {
  if (!/^\d+(\.\d+)?$/.test(value)) return value;
  const [integer, fraction = ""] = value.split(".");
  const decimals = fraction.replace(/0+$/, "");
  return `${BigInt(integer).toLocaleString("vi-VN")}${decimals ? `,${decimals}` : ""}`;
};

const weightStatuses = {
  below: { color: "bg-yellow-500", label: "Khối lượng thấp hơn mức cho phép" },
  within: { color: "bg-green-500", label: "Khối lượng trong mức cho phép" },
  above: { color: "bg-red-500", label: "Khối lượng cao hơn mức cho phép" },
};

export default function WeighingRecordMaterials({
  recordId,
  isImportOpen,
  onImportOpenChange,
  locked,
  weighingLocked,
  onChanged,
  isEditing = false,
}: {
  recordId: number;
  isImportOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  locked: boolean;
  weighingLocked: boolean;
  onChanged: () => Promise<unknown>;
  isEditing?: boolean;
}) {
  const [selectedStage, setSelectedStage] = useState("");
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState<{
    itemCode: string;
    unit: string;
  } | null>(null);
  const base = API_ROUTES.productionOrders.weighingRecordDetail(recordId);
  const {
    data: lines,
    error,
    isLoading,
    mutate,
  } = useSWR(`${base}/lines`, () => service.fetchLines(recordId));
  const {
    data: stages,
    error: stagesError,
    isLoading: stagesLoading,
    mutate: refreshStages,
  } = useSWR(isImportOpen ? `${base}/stages` : null, () =>
    service.fetchStages(recordId),
  );
  const stage = stages?.find((entry) => String(entry.id) === selectedStage);
  const summary = summarizeWeighings(lines ?? []);
  const groupedLines = groupRequiredQuantities(
    [...(lines ?? [])].sort(compareMaterials),
  );
  const selectedMaterial = selectedQuantity
    ? groupedLines.find(
        ({ line }) =>
          line.item_code === selectedQuantity.itemCode &&
          line.unit === selectedQuantity.unit,
      )
    : undefined;
  const selectedActualTotal = selectedMaterial?.actualTotals.find(
    ({ unit }) => unit === selectedQuantity?.unit,
  )?.total ?? "0";
  const remainingQuantity = selectedMaterial
    ? sumWeights([
        selectedMaterial.requiredTotal,
        selectedActualTotal.startsWith("-")
          ? selectedActualTotal.slice(1)
          : `-${selectedActualTotal}`,
      ])
    : "0";

  const importStage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || locked || !stage || stage.imported) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const imported = await service.importStage(recordId, stage.id);
      await mutate(
        (current) => [...(current ?? []), ...imported].sort(compareMaterials),
        { revalidate: false },
      );
      onImportOpenChange(false);
      setSelectedStage("");
      toast.success(`Đã thêm ${imported.length} dòng hàng vào phiếu cân.`);
      void mutate().catch(() => undefined);
      void onChanged().catch(() => undefined);
      void refreshStages().catch(() => undefined);
    } catch (error) {
      setSubmitError(
        message(error, "Không thể thêm hàng hóa từ giai đoạn đã chọn."),
      );
      void refreshStages().catch(() => undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mt-6">
        <h3 className="mb-2 text-base font-bold uppercase">
          Danh sách nguyên liệu
        </h3>
        {isLoading ? (
          <p role="status" className="py-4 text-center">
            Đang tải nguyên liệu...
          </p>
        ) : error ? (
          <div
            role="alert"
            className="border border-red-200 bg-red-50 p-3 font-sans text-sm text-red-700"
          >
            <p>{message(error, "Không thể tải danh sách nguyên liệu.")}</p>
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
        ) : lines?.length ? (
          <table className="w-full table-fixed border-collapse border border-black text-[14px] leading-5 print:text-[12px] print:leading-4 [&_td]:[overflow-wrap:anywhere]">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[21%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead>
              <tr>
                {["Mã NL", "Tên nguyên liệu", "Số lô"].map((label) => (
                  <th
                    key={label}
                    rowSpan={2}
                    scope="col"
                    className="border border-black px-1 py-1.5 text-center font-bold"
                  >
                    {label}
                  </th>
                ))}
                <th
                  colSpan={6}
                  scope="colgroup"
                  className="border border-black px-1 py-1.5 text-center font-bold"
                >
                  Số lượng/ Đơn vị
                </th>
              </tr>
              <tr>
                {[
                  "Yêu cầu",
                  "Tổng lượng YC",
                  "Tổng lượng TT",
                  "Thực tế",
                  "Tổng khối lượng",
                  "ĐVT",
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="border border-black px-1 py-1.5 text-center font-bold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedLines.map(
                ({ line, requiredTotal, requiredRowSpan, actualTotals }) => (
                  <tr key={line.id}>
                    <td className="break-words border border-black px-1 py-1.5">
                      <div className="flex items-start justify-between gap-1">
                        {isEditing && !locked ? (
                          <WeighingRecordMaterialMenu
                            recordId={recordId}
                            line={line}
                            disabled={locked}
                            onUpdated={async (updated) => {
                              await mutate(
                                (current) =>
                                  current
                                    ?.map((entry) =>
                                      entry.id === updated.id
                                        ? { ...entry, ...updated }
                                        : entry,
                                    )
                                    .sort(compareMaterials),
                                { revalidate: false },
                              );
                              void mutate().catch(() => undefined);
                              void onChanged().catch(() => undefined);
                            }}
                            onDeleted={async () => {
                              await mutate(
                                (current) =>
                                  current?.filter(
                                    (entry) => entry.id !== line.id,
                                  ),
                                { revalidate: false },
                              );
                              void mutate().catch(() => undefined);
                              void onChanged().catch(() => undefined);
                              void refreshStages().catch(() => undefined);
                            }}
                          />
                        ) : null}
                        <span className="min-w-0 break-words">
                          {line.item_code}
                        </span>
                      </div>
                    </td>
                    <td className="break-words border border-black px-1 py-1.5">
                      {line.item_name}
                      {line.note ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {line.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="break-words border border-black px-1 py-1.5">
                      <WeighingRecordLotCheckButton
                        recordId={recordId}
                        line={line}
                        onSaved={async (lotCheck) => {
                          await mutate(
                            (current) => current?.map((entry) =>
                              entry.id === line.id ? { ...entry, lotCheck } : entry,
                            ),
                            { revalidate: false },
                          );
                          void mutate().catch(() => undefined);
                        }}
                      />
                    </td>
                    <td className="border border-black px-1 py-1.5 text-right tabular-nums">
                      {quantityLabel(line.planned_quantity)}
                    </td>
                    {requiredRowSpan > 0 ? (
                      <td
                        rowSpan={requiredRowSpan}
                        className="border border-black px-1 py-1.5 text-right align-middle tabular-nums"
                      >
                        <button
                          type="button"
                          className="cursor-pointer rounded-sm underline decoration-dotted underline-offset-4 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 print:no-underline"
                          aria-label={`Xem lượng còn thiếu của ${line.item_code}`}
                          onClick={() =>
                            setSelectedQuantity({
                              itemCode: line.item_code,
                              unit: line.unit,
                            })
                          }
                        >
                          {quantityLabel(requiredTotal)}
                        </button>
                      </td>
                    ) : null}
                    {requiredRowSpan > 0 ? (
                      <td
                        rowSpan={requiredRowSpan}
                        className="border border-black px-1 py-1.5 text-right align-middle tabular-nums"
                      >
                        {actualTotals.length ? (
                          actualTotals.map(({ unit, total }) => {
                            const status =
                              unit === line.unit
                                ? weightStatuses[
                                    getWeightStatus(requiredTotal, total)
                                  ]
                                : null;
                            return (
                              <p
                                key={unit}
                                className="flex items-center justify-end gap-1.5"
                              >
                                {status ? (
                                  <span
                                    role="img"
                                    aria-label={status.label}
                                    title={status.label}
                                    className={`size-2 shrink-0 rounded-full print:[print-color-adjust:exact] ${status.color}`}
                                  />
                                ) : null}
                                <span>
                                  {formatWeight(total)}
                                  {unit !== line.unit ? ` ${unit}` : ""}
                                </span>
                              </p>
                            );
                          })
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    ) : null}
                    <td
                      className={`border border-black px-1 py-1.5 ${(line.details?.length ?? 0) === 0 ? "align-middle" : "align-top"}`}
                    >
                      <WeighingRecordWeightCell
                        recordId={recordId}
                        line={line}
                        locked={weighingLocked}
                        onSaved={async (detail) => {
                          await mutate(
                            (current) =>
                              current?.map((entry) =>
                                entry.id === line.id
                                  ? {
                                      ...entry,
                                      details: [
                                        ...(entry.details ?? []).filter(
                                          (saved) => saved.id !== detail.id,
                                        ),
                                        detail,
                                      ],
                                    }
                                  : entry,
                              ),
                            { revalidate: false },
                          );
                          void mutate().catch(() => undefined);
                          void onChanged().catch(() => undefined);
                        }}
                      />
                    </td>
                    <td className="border border-black px-1 py-1.5 text-right tabular-nums">
                      <WeighingRecordWeightTotal line={line} />
                    </td>
                    <td className="break-words border border-black px-1 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>{line.unit}</span>
                        <WeighingRecordDetailMenu
                          recordId={recordId}
                          line={line}
                        />
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        ) : (
          <p className="border border-dashed p-5 text-center text-sm text-slate-500">
            Chưa có nguyên liệu trong phiếu cân.
          </p>
        )}
      </div>

      {!isLoading && !error && lines ? (
        <div className="mt-4 space-y-2 text-[14px] leading-5 print:text-[12px] print:leading-4">
          <p className="whitespace-pre-wrap break-words">
            <span className="font-bold">Ghi chú: </span>
            {summary.notes || "—"}
          </p>
          <p className="break-words">
            <span className="font-bold">Người cân: </span>
            {summary.weighers || "—"}
          </p>
        </div>
      ) : null}

      <Dialog
        open={selectedQuantity !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedQuantity(null);
        }}
      >
        <DialogContent className="font-sans sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lượng còn thiếu</DialogTitle>
            <DialogDescription>
              {selectedMaterial
                ? `${selectedMaterial.line.item_code} — ${selectedMaterial.line.item_name}`
                : "Nguyên liệu không còn trong phiếu cân."}
            </DialogDescription>
          </DialogHeader>
          {selectedMaterial ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Tổng lượng YC</dt>
                <dd className="text-right tabular-nums">
                  {formatWeight(selectedMaterial.requiredTotal)} {selectedMaterial.line.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Tổng lượng TT</dt>
                <dd className="text-right tabular-nums">
                  {formatWeight(selectedActualTotal)} {selectedMaterial.line.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3 font-semibold">
                <dt>Lượng còn thiếu</dt>
                <dd className="text-right tabular-nums">
                  {formatWeight(remainingQuantity)} {selectedMaterial.line.unit}
                </dd>
              </div>
            </dl>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setSelectedQuantity(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isImportOpen}
        onOpenChange={(open) => {
          if (isSubmitting) return;
          onImportOpenChange(open);
          if (!open) {
            setSelectedStage("");
            setSubmitError("");
          }
        }}
      >
        <DialogContent className="font-sans sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Thêm hàng hóa theo giai đoạn</DialogTitle>
            <DialogDescription>
              Chọn giai đoạn để thêm toàn bộ hàng hóa thuộc giai đoạn đó từ lệnh
              sản xuất vào phiếu cân.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={importStage} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor={`weighing-stage-${recordId}`}
                className="text-sm font-medium"
              >
                Giai đoạn
              </label>
              <select
                id={`weighing-stage-${recordId}`}
                value={selectedStage}
                required
                disabled={
                  stagesLoading ||
                  Boolean(stagesError) ||
                  isSubmitting ||
                  locked
                }
                onChange={(event) => {
                  setSelectedStage(event.target.value);
                  setSubmitError("");
                }}
                className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">
                  {stagesLoading ? "Đang tải giai đoạn..." : "Chọn giai đoạn"}
                </option>
                {stages?.map((entry) => (
                  <option
                    key={entry.id}
                    value={entry.id}
                    disabled={entry.imported}
                  >
                    {entry.name} · {entry.material_count} dòng
                    {entry.imported ? " · Đã thêm" : ""}
                  </option>
                ))}
              </select>
              {stage && !stage.imported ? (
                <p className="text-sm text-slate-500">
                  Sẽ thêm {stage.material_count} dòng hàng vào phiếu cân.
                </p>
              ) : null}
              {!stagesLoading && !stagesError && stages?.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Lệnh sản xuất không có giai đoạn chứa hàng hóa.
                </p>
              ) : null}
              {stages?.length && stages.every((entry) => entry.imported) ? (
                <p className="text-sm text-slate-500">
                  Tất cả giai đoạn đã được thêm vào phiếu cân.
                </p>
              ) : null}
              {stagesError ? (
                <div role="alert" className="text-sm text-red-600">
                  <p>
                    {message(
                      stagesError,
                      "Không thể tải giai đoạn từ lệnh sản xuất.",
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshStages().catch(() => undefined)}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : null}
              {submitError ? (
                <p role="alert" className="text-sm text-red-600">
                  {submitError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  onImportOpenChange(false);
                  setSelectedStage("");
                  setSubmitError("");
                }}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || locked}
                onClick={() => {
                  onImportOpenChange(false);
                  setSelectedStage("");
                  setSubmitError("");
                  setIsManualOpen(true);
                }}
              >
                <Plus className="size-4" />
                Thêm thủ công
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  stagesLoading ||
                  Boolean(stagesError) ||
                  !stage ||
                  stage.imported ||
                  locked
                }
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isSubmitting ? "Đang thêm..." : "Thêm vào phiếu cân"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <WeighingRecordManualImport
        recordId={recordId}
        open={isManualOpen}
        onOpenChange={setIsManualOpen}
        locked={locked}
        onImported={async (imported) => {
          await mutate(
            (current) =>
              [...(current ?? []), ...imported].sort(compareMaterials),
            { revalidate: false },
          );
          void mutate().catch(() => undefined);
          void onChanged().catch(() => undefined);
          void refreshStages().catch(() => undefined);
        }}
      />
    </>
  );
}
