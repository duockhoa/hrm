"use client";

import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionOrderLineClearanceCheck } from "../types";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { PreviousProductionOrder } from "../types";
import {
  formatDateTime,
  getPreviousProductionOrderInfo,
  getUserLabel,
} from "../utils";

function LineClearanceChecksSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-7 w-10 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function InlineProductionOrderLineClearanceChecks({
  data,
  selectedCheckId,
  onSelectCheck,
}: {
  data: ProductionOrderLineClearanceCheck[] | undefined;
  selectedCheckId?: string | number | null;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  const { data: productionOrders = [] } = useSWR<PreviousProductionOrder[]>(
    API_ROUTES.productionOrders.base,
    productionOrdersService.fetchProductionOrders,
  );

  if (!data) return <LineClearanceChecksSkeleton />;

  return (
    <div className="w-full max-w-4xl min-w-0 overflow-hidden rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Dọn quang dây chuyền</h2>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
          {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có hạng mục dọn quang dây chuyền.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="border-r">Thời điểm</TableHead>
                <TableHead className="border-r">Loại kiểm tra</TableHead>
                <TableHead className="border-r">Sản phẩm/lô trước</TableHead>
                <TableHead className="border-r">Kết quả</TableHead>
                <TableHead>Người nhập</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const previousOrder = getPreviousProductionOrderInfo(
                  item,
                  productionOrders,
                );
                const checkId = item.id;
                const selectable = checkId !== null && checkId !== undefined;
                const selected =
                  selectedCheckId !== null &&
                  selectedCheckId !== undefined &&
                  selectable &&
                  String(selectedCheckId) === String(checkId);

                return (
                  <TableRow
                    key={item.id ?? index}
                    tabIndex={selectable && onSelectCheck ? 0 : undefined}
                    aria-selected={selected}
                    data-state={selected ? "selected" : undefined}
                    className={selectable && onSelectCheck ? "cursor-pointer" : undefined}
                    onClick={() => selectable && onSelectCheck?.(checkId)}
                    onKeyDown={(event) => {
                      if (!selectable || !onSelectCheck) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectCheck(checkId);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap border-r">
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell className="max-w-48 whitespace-normal break-words border-r">
                      {item.check_type || "—"}
                    </TableCell>
                    <TableCell className="min-w-52 whitespace-normal border-r">
                      <div className="font-medium">
                        {previousOrder.productName || "—"}
                      </div>
                      {previousOrder.lotNo ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Lô: {previousOrder.lotNo}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="border-r">
                      <span
                        className={
                          item.result === "Đạt"
                            ? "font-medium text-emerald-700"
                            : item.result === "Không đạt"
                              ? "font-medium text-red-600"
                              : undefined
                        }
                      >
                        {item.result || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-44 whitespace-normal break-words">
                      {getUserLabel(item.createdBy)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
