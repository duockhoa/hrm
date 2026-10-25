"use client";

import { useState } from "react";
import useSWR from "swr";
import { isAxiosError } from "axios";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import service from "@/services/production-order-weighing-records.service";
import type { ProductionOrderWeighingRecordLine } from "../types";

export default function WeighingRecordManualImport({
  recordId,
  open,
  onOpenChange,
  locked,
  onImported,
}: {
  recordId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locked: boolean;
  onImported: (lines: ProductionOrderWeighingRecordLine[]) => Promise<unknown>;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { data, error, isLoading, mutate } = useSWR(
    open
      ? `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/source-materials`
      : null,
    () => service.fetchSourceMaterials(recordId),
  );
  const visible = data
    ?.filter((line) =>
      [line.item_code, line.item_name, line.lot_no, line.stage_name].some(
        (text) =>
          text
            ?.toLocaleLowerCase("vi")
            .includes(search.trim().toLocaleLowerCase("vi")),
      ),
    )
    .sort(
      (a, b) =>
        a.item_code.localeCompare(b.item_code, "vi") ||
        (a.source_line_number ?? 0) - (b.source_line_number ?? 0),
    );
  const eligible = selected.filter((id) =>
    data?.some((line) => line.source_line_number === id && !line.imported),
  );
  const changeOpen = (next: boolean) => {
    if (busy) return;
    onOpenChange(next);
    if (!next) {
      setSelected([]);
      setSearch("");
      setSubmitError("");
    }
  };
  const submit = async () => {
    if (busy || locked || !eligible.length) return;
    setBusy(true);
    setSubmitError("");
    try {
      const imported = await service.importLines(recordId, eligible);
      await onImported(imported);
      onOpenChange(false);
      setSelected([]);
      setSearch("");
      toast.success(`Đã thêm ${imported.length} dòng hàng vào phiếu cân.`);
    } catch (error) {
      const detail: unknown = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setSubmitError(
        typeof detail === "string"
          ? detail
          : "Không thể thêm nguyên vật liệu vào phiếu cân.",
      );
      void mutate().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="font-sans sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Thêm nguyên vật liệu thủ công</DialogTitle>
          <DialogDescription>
            Chọn nguyên vật liệu từ các dòng của lệnh sản xuất để thêm vào phiếu
            cân.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Tìm nguyên vật liệu"
          placeholder="Tìm mã, tên nguyên liệu, số lô, giai đoạn..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {isLoading ? (
          <p role="status">Đang tải nguyên vật liệu...</p>
        ) : error ? (
          <div role="alert" className="text-sm text-red-600">
            Không thể tải nguyên vật liệu.{" "}
            <Button
              variant="outline"
              onClick={() => void mutate().catch(() => undefined)}
            >
              Thử lại
            </Button>
          </div>
        ) : (
          <div className="max-h-[55vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {[
                    "Chọn",
                    "Mã NL",
                    "Tên nguyên liệu",
                    "Số lô",
                    "Giai đoạn",
                    "Số lượng",
                    "Đơn vị",
                  ].map((label) => (
                    <th key={label} className="border-b p-2 text-left">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible?.map((line) => (
                  <tr
                    key={line.source_line_number}
                    className={
                      line.imported
                        ? "bg-slate-50 text-slate-400"
                        : "hover:bg-slate-50"
                    }
                  >
                    <td className="border-b p-2">
                      {line.imported ? (
                        <span className="whitespace-nowrap text-xs">
                          Đã thêm
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${line.item_code}, lô ${line.lot_no || "chưa có"}, dòng ${line.source_line_number}`}
                          disabled={
                            busy || locked || line.source_line_number === null
                          }
                          checked={
                            line.source_line_number !== null &&
                            selected.includes(line.source_line_number)
                          }
                          onChange={(event) => {
                            const id = line.source_line_number;
                            if (id === null) return;
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, id]
                                : current.filter((value) => value !== id),
                            );
                          }}
                        />
                      )}
                    </td>
                    <td className="border-b p-2">{line.item_code}</td>
                    <td className="border-b p-2">{line.item_name}</td>
                    <td className="border-b p-2">{line.lot_no || "—"}</td>
                    <td className="border-b p-2">{line.stage_name || "—"}</td>
                    <td className="border-b p-2 text-right">
                      {Number(line.planned_quantity).toLocaleString("vi-VN", {
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    <td className="border-b p-2">{line.unit}</td>
                  </tr>
                ))}
                {!visible?.length ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      Không có nguyên vật liệu phù hợp.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        {submitError ? (
          <p role="alert" className="text-sm text-red-600">
            {submitError}
          </p>
        ) : null}
        <DialogFooter>
          <span className="mr-auto self-center text-sm text-slate-500">
            Đã chọn {eligible.length} dòng
          </span>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => changeOpen(false)}
          >
            Hủy
          </Button>
          <Button
            disabled={
              busy || locked || !eligible.length || isLoading || Boolean(error)
            }
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {busy ? "Đang thêm..." : "Thêm vào phiếu cân"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
