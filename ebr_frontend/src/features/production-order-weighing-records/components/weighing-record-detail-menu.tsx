"use client";

import { useState } from "react";
import useSWR from "swr";
import { isAxiosError } from "axios";
import { EllipsisVertical, Eye, Loader2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_ROUTES } from "@/lib/api-routes";
import service from "@/services/production-order-weighing-records.service";
import type { ProductionOrderWeighingRecordLine } from "../types";
import { formatWeight } from "../weight-utils";

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

export default function WeighingRecordDetailMenu({
  recordId,
  line,
}: {
  recordId: number;
  line: ProductionOrderWeighingRecordLine;
}) {
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 shrink-0 p-0 text-slate-700"
            aria-label={`Chi tiết các lần cân của ${line.item_code}, dòng ${line.id}`}
            title="Chi tiết các lần cân"
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="font-sans">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <Eye className="size-4" />
            Xem chi tiết
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden font-sans sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Chi tiết các lần cân</DialogTitle>
            <DialogDescription>
              {line.item_code} — {line.item_name}
              {line.lot_no ? ` · Lô ${line.lot_no}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-auto pr-1">
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
                            {formatWeight(detail.net_weight)}
                          </td>
                          <td className="break-words border border-slate-300 px-3 py-3 text-center">
                            {detail.unit}
                          </td>
                          <td className="whitespace-pre-wrap break-words border border-slate-300 px-3 py-3">
                            {detail.note || "—"}
                          </td>
                          <td className="border border-slate-300 px-3 py-3">
                            {detail.image_path ? (
                              <AuthenticatedImage
                                src={detail.image_path}
                                alt={`Ảnh lần cân ${index + 1} của ${line.item_code}`}
                                previewTitle={`Lần cân ${index + 1} — ${line.item_code}`}
                                width={140}
                                height={100}
                                className="h-24 w-full rounded border"
                                objectFit="contain"
                              />
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
                        </tr>
                      ))}
                  </tbody>
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
              onClick={() => setOpen(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
