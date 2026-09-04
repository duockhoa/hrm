"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { PostSecondaryPackagingSummary } from "../types";
import {
  formatDateTime,
  formatNumber,
  getPendingCancellationItems,
  getPendingProcessItems,
  getSummaryOrder,
  getSummaryUser,
  getUserLabel,
} from "../utils";
import PostSecondaryPackagingSummaryForm from "./post-secondary-packaging-summary-form";
import PostSecondaryPackagingSummaryDetail from "./post-secondary-packaging-summary-detail";

const getSemiFinishedLotLabel = (summary: PostSecondaryPackagingSummary) => {
  const order = getSummaryOrder(summary);
  const productName = order?.item?.item_name ?? order?.description ?? "—";
  const lotNo = order?.lot_no ?? "—";
  return `${productName} - ${lotNo}`;
};

const toQuantity = (value: string | number | null | undefined) => {
  const quantity = Number(String(value ?? 0).replace(",", "."));
  return Number.isFinite(quantity) ? quantity : 0;
};

export default function InlinePostSecondaryPackagingSummaries({
  id,
  onClose,
  embedded = false,
  onSelectSummary,
}: {
  id: string | number;
  onClose?: () => void;
  embedded?: boolean;
  onSelectSummary?: (summaryId: string | number) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSummaryId, setSelectedSummaryId] = useState<
    string | number | null
  >(null);
  const { data, isLoading, error } = useSWR<PostSecondaryPackagingSummary[]>(
    API_ROUTES.productionOrders.postSecondaryPackagingSummaries(id),
    () => productionOrdersService.fetchPostSecondaryPackagingSummaries(id),
  );
  const summaries = Array.isArray(data) ? data : [];
  const usedOrderIds = summaries
    .map((summary) => summary.semi_finished_product_order_id)
    .filter((id): id is string | number => id !== null && id !== undefined);

  if (selectedSummaryId !== null) {
    return (
      <PostSecondaryPackagingSummaryDetail
        id={selectedSummaryId}
        onClose={() => setSelectedSummaryId(null)}
      />
    );
  }

  return (
    <section
      id="post-secondary-packaging-summaries"
      className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md"
      aria-labelledby={
        embedded ? "post-secondary-packaging-summaries-title" : undefined
      }
      aria-label={embedded ? undefined : "Tổng kết BTP hoàn thiện"}
    >
      {!embedded && onClose ? (
        <DetailPanelHeader
          title="Tổng kết BTP hoàn thiện"
          subtitle={`Lệnh sản xuất #${id}`}
          actions={
            <Button type="button" size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" />
              Thêm mới
            </Button>
          }
          onClose={onClose}
        />
      ) : null}

      {embedded ? (
        <div className="mb-4 flex items-center gap-3">
          <h2
            id="post-secondary-packaging-summaries-title"
            className="text-lg font-semibold"
          >
            Tổng kết BTP hoàn thiện
          </h2>
          <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
            {summaries.length}
          </span>
        </div>
      ) : (
        <div className="mt-4" />
      )}

      {!embedded ? (
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="sr-only">
                Thêm tổng kết BTP hoàn thiện
              </DialogTitle>
            </DialogHeader>
            <PostSecondaryPackagingSummaryForm
              productionOrderId={id}
              usedSemiFinishedOrderIds={usedOrderIds}
              onCancel={() => setIsCreating(false)}
              onSaved={(createdSummary) => {
                setIsCreating(false);

                if (
                  createdSummary.id === null ||
                  createdSummary.id === undefined
                ) {
                  return;
                }

                if (onSelectSummary) {
                  onSelectSummary(createdSummary.id);
                } else {
                  setSelectedSummaryId(createdSummary.id);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="m-4 flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <AlertTriangle className="size-4" />
          Không thể tải danh sách tổng kết BTP hoàn thiện.
        </div>
      ) : summaries.length === 0 ? (
        embedded ? (
          <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
            Chưa có dữ liệu tổng kết BTP hoàn thiện.
          </div>
        ) : (
          <button
            type="button"
            className="m-4 flex w-[calc(100%-2rem)] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="mb-2 size-6" />
            Chưa có dữ liệu. Bấm để thêm bản tổng kết đầu tiên.
          </button>
        )
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="border-r">Thời điểm</TableHead>
                <TableHead className="border-r">Lô BTP</TableHead>
                <TableHead className="border-r text-right">
                  Số tải nhận
                </TableHead>
                <TableHead className="border-r text-right">
                  Số lượng tồn
                </TableHead>
                <TableHead className="border-r">Đơn vị</TableHead>
                <TableHead className="border-r text-right">
                  Số lượng chờ xử lý
                </TableHead>
                <TableHead className="border-r text-right">
                  Số lượng hủy
                </TableHead>
                <TableHead>Người nhập</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary, index) => {
                const id = summary.id;
                const canSelect = id !== null && id !== undefined;
                const pendingProcessQuantity = getPendingProcessItems(
                  summary,
                ).reduce(
                  (total, item) => total + toQuantity(item.pending_quantity),
                  0,
                );
                const cancellationQuantity = getPendingCancellationItems(
                  summary,
                ).reduce(
                  (total, item) =>
                    total + toQuantity(item.cancellation_quantity),
                  0,
                );
                return (
                  <TableRow
                    key={id ?? index}
                    tabIndex={canSelect ? 0 : undefined}
                    className={canSelect ? "cursor-pointer" : undefined}
                    onClick={() => {
                      if (id !== null && id !== undefined) {
                        if (onSelectSummary) onSelectSummary(id);
                        else setSelectedSummaryId(id);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        (event.key === "Enter" || event.key === " ") &&
                        id !== null &&
                        id !== undefined
                      ) {
                        event.preventDefault();
                        if (onSelectSummary) onSelectSummary(id);
                        else setSelectedSummaryId(id);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap border-r">
                      {formatDateTime(summary.created_at)}
                    </TableCell>
                    <TableCell className="min-w-56 border-r font-medium">
                      {getSemiFinishedLotLabel(summary)}
                    </TableCell>
                    <TableCell className="border-r text-right tabular-nums">
                      {formatNumber(summary.received_bag_count)}
                    </TableCell>
                    <TableCell className="border-r text-right tabular-nums">
                      {formatNumber(summary.remaining_quantity)}
                    </TableCell>
                    <TableCell className="border-r">
                      {summary.unit || "—"}
                    </TableCell>
                    <TableCell className="border-r text-right tabular-nums">
                      {formatNumber(pendingProcessQuantity)}
                    </TableCell>
                    <TableCell className="border-r text-right tabular-nums">
                      {formatNumber(cancellationQuantity)}
                    </TableCell>
                    <TableCell>
                      {getUserLabel(getSummaryUser(summary))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
