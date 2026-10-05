"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import type { PostSecondaryPackagingSummary } from "@/features/production-order-post-secondary-packaging-summaries/types";
import type { ProductionRange, ProductionSummary, ReportProductionOrder } from "../production-report";
import { buildOutputLossRows, sumUnitQuantities, type UnitQuantities } from "../output-loss-report";
import ReportProductFilter from "./report-product-filter";

const EMPTY_OUTPUT: ProductionSummary[] = [];
const EMPTY_PACKAGING: PostSecondaryPackagingSummary[] = [];
const number = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
const percent = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
const quantities = (group: UnitQuantities) => Object.entries(group)
  .sort(([a], [b]) => a.localeCompare(b, "vi"))
  .map(([unit, quantity]) => `${number(quantity)} ${unit}`).join("; ") || "0";

export default function OutputLossReport({ orders, range }: {
  orders: ReportProductionOrder[];
  range: ProductionRange;
}) {
  const [product, setProduct] = useState("all");
  const output = useSWR<ProductionSummary[]>(API_ROUTES.productionOrders.finishedProductSummaries, productOrdersService.fetchFinishedProductSummaries);
  const packaging = useSWR<PostSecondaryPackagingSummary[]>(API_ROUTES.productionOrders.postSecondaryPackagingReport, productOrdersService.fetchPostSecondaryPackagingReport);
  const rows = useMemo(() => buildOutputLossRows(orders, output.data ?? EMPTY_OUTPUT, packaging.data ?? EMPTY_PACKAGING, range), [orders, output.data, packaging.data, range]);
  const options = useMemo(() => Array.from(new Map(rows.map((row) => [row.productKey, row.product])), ([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi")), [rows]);
  const filtered = useMemo(() => rows.filter((row) => product === "all" || row.productKey === product), [rows, product]);
  const totals = useMemo(() => {
    const comparable = filtered.filter((row) => row.achievement !== null);
    const planned = comparable.reduce((sum, row) => sum + (row.planned ?? 0), 0);
    const actual = comparable.reduce((sum, row) => sum + (row.actual ?? 0), 0);
    return {
      planned: sumUnitQuantities(filtered.flatMap((row) => row.planned === null ? [] : [{ [row.unit || "chưa rõ đơn vị"]: row.planned }])),
      actual: filtered.reduce((sum, row) => sum + (row.actual ?? 0), 0),
      achievement: planned > 0 ? actual / planned * 100 : null,
      pending: sumUnitQuantities(filtered.map((row) => row.pending)),
      cancellation: sumUnitQuantities(filtered.map((row) => row.cancellation)),
    };
  }, [filtered]);
  const loading = output.isLoading || packaging.isLoading;
  const error = output.error || packaging.error;

  return (
    <div className="space-y-4">
      <section aria-label="Bộ lọc báo cáo sản lượng, hư hao" className="rounded-xl border bg-white p-4">
        <div className="max-w-md">
          <ReportProductFilter id="output-loss-product" value={product} onChange={setProduct} options={options} />
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4">
          <h2 className="text-base font-semibold">Báo cáo sản lượng, hư hao</h2>
          <p className="mt-1 text-sm text-gray-500">{filtered.length} lô thành phẩm · Sản lượng tổng kết tính bằng hộp. Số lượng chờ xử lý, chờ huỷ theo đơn vị đã ghi nhận.</p>
        </div>
        {error ? <p role="alert" className="p-6 text-center text-sm text-red-600">Không thể tải dữ liệu sản lượng, hư hao. Vui lòng thử lại sau.</p>
          : loading ? <div className="p-4"><Skeleton className="h-64 w-full" /></div>
            : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã lệnh sản xuất</TableHead>
                  <TableHead>Mã TP</TableHead>
                  <TableHead>Số lô</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead className="text-right">Số lượng kế hoạch</TableHead>
                  <TableHead className="text-right">Tổng sản lượng</TableHead>
                  <TableHead className="text-right" title="Sản lượng tổng kết / kế hoạch × 100. Chỉ tính khi kế hoạch lớn hơn 0 và có cùng đơn vị hộp.">Đạt kế hoạch (%)</TableHead>
                  <TableHead className="text-right">Số lượng chờ xử lý</TableHead>
                  <TableHead className="text-right">Số lượng chờ huỷ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? filtered.map((row) => <TableRow key={row.id}>
                  <TableCell>{row.source.production_order_code || `LSX #${row.id}`}</TableCell>
                  <TableCell>{row.itemCode || "—"}</TableCell>
                  <TableCell className="font-medium">{row.lot}</TableCell>
                  <TableCell className="max-w-sm whitespace-normal">{row.source.item?.item_name?.trim() || row.source.description?.trim() || "Chưa rõ sản phẩm"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.planned === null ? "Chưa ghi nhận" : `${number(row.planned)} ${row.unit || "chưa rõ đơn vị"}`}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.actual === null ? "Chưa tổng kết" : number(row.actual)}</TableCell>
                  <TableCell className="text-right tabular-nums" title={row.achievement === null ? "Cần sản lượng tổng kết và kế hoạch lớn hơn 0, cùng đơn vị hộp." : undefined}>{row.achievement === null ? "—" : percent(row.achievement)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.hasPackagingSummary ? quantities(row.pending) : "Chưa tổng kết"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.hasPackagingSummary ? quantities(row.cancellation) : "Chưa tổng kết"}</TableCell>
                </TableRow>) : <TableRow><TableCell colSpan={9} className="h-24 text-center text-gray-500">Không có lô thành phẩm phù hợp với bộ lọc.</TableCell></TableRow>}
              </TableBody>
              {filtered.length ? <TableFooter><TableRow>
                <TableCell colSpan={4}>Tổng cộng đã ghi nhận</TableCell>
                <TableCell className="text-right tabular-nums">{filtered.some((row) => row.planned !== null) ? quantities(totals.planned) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{filtered.some((row) => row.actual !== null) ? number(totals.actual) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums" title="Tổng sản lượng / tổng kế hoạch của các lô có đủ dữ liệu và cùng đơn vị hộp × 100.">{totals.achievement === null ? "—" : percent(totals.achievement)}</TableCell>
                <TableCell className="text-right tabular-nums">{filtered.some((row) => row.hasPackagingSummary) ? quantities(totals.pending) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{filtered.some((row) => row.hasPackagingSummary) ? quantities(totals.cancellation) : "—"}</TableCell>
              </TableRow></TableFooter> : null}
            </Table>}
      </section>
    </div>
  );
}
