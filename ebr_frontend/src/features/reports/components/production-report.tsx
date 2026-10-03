"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Factory,
  Package,
  RotateCcw,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import { getReportDay } from "../report-date";
import {
  buildProductionReport,
  buildProductionRows,
  EMPTY_PRODUCTION_FILTERS,
  filterProductionRows,
  PRODUCTION_STATES,
  summaryQuantity,
  type ProductionFilters,
  type ProductionRange,
  type ProductionRow,
  type ProductionSummary,
  type ReportProductionOrder,
} from "../production-report";
import ProductionReportCharts, {
  formatProductionNumber as number,
  formatProductionPercent as percent,
  productionDayLabel as dayLabel,
  ProductionPanel,
} from "./production-report-charts";

const EMPTY_SUMMARIES: ProductionSummary[] = [];
const categoryLabel = (category: string) =>
  category === "finished" ? "Thành phẩm" : category === "semi" ? "Bán thành phẩm" : "Chưa phân loại";
const plannedLabel = (row: ProductionRow) =>
  row.planned === null ? "Chưa ghi nhận" : `${number(row.planned)} ${row.unit || "(chưa rõ đơn vị)"}`;
const actualLabel = (row: ProductionRow, hasData: boolean) =>
  row.category !== "finished"
    ? "—"
    : !hasData
      ? "Chưa tải được"
      : row.actual === null
        ? "Chưa có số lượng"
        : `${number(row.actual)} hộp`;

function StateBadge({ row }: { row: ProductionRow }) {
  const state = PRODUCTION_STATES.find((item) => item.key === row.status)!;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: state.color }} />
      {row.statusLabel}
    </span>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  all = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  all?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={!all && !options.length}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Chưa có đơn vị" />
        </SelectTrigger>
        <SelectContent>
          {all ? <SelectItem value="all">Tất cả</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OrderDetails({ row, hasSummaryData }: { row: ProductionRow; hasSummaryData: boolean }) {
  return (
    <div className="space-y-4 p-4">
      <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Mã lệnh", row.source.production_order_code || row.id],
          ["Nhóm sản phẩm", categoryLabel(row.category)],
          ["Ngày tạo lệnh", dayLabel(getReportDay(row.source.creation_date) ?? getReportDay(row.source.created_at))],
          ["Ngày bắt đầu", dayLabel(getReportDay(row.source.start_date))],
          ["Ngày sản xuất", dayLabel(getReportDay(row.source.date_manufacture))],
          ["Hạn dùng", dayLabel(getReportDay(row.source.expire_date))],
          ["Quy cách đóng gói", row.source.packing_specification || "Chưa ghi nhận"],
          ["Kho", row.warehouse],
          ["Kế hoạch", plannedLabel(row)],
          ["Thực tế thành phẩm", actualLabel(row, hasSummaryData)],
          [
            "Chênh lệch thực tế − kế hoạch",
            hasSummaryData && row.difference !== null
              ? `${row.difference > 0 ? "+" : ""}${number(row.difference)} hộp`
              : "—",
          ],
          ["Đạt kế hoạch", hasSummaryData ? percent(row.achievement) : "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 break-words font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      {row.source.remarks ? (
        <div>
          <p className="text-xs font-medium text-slate-500">Ghi chú lệnh</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{row.source.remarks}</p>
        </div>
      ) : null}
      {row.category === "finished" ? (
        <div className="rounded-lg border bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold">
            Phiếu tổng kết thành phẩm ({hasSummaryData ? row.summaries.length : "—"})
          </h3>
          {!hasSummaryData ? (
            <p className="text-sm text-slate-500">Dữ liệu tổng kết chưa sẵn sàng.</p>
          ) : row.summaries.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    {["Phiếu / Ngày", "Số kiện", "Hộp/kiện", "Hộp lẻ", "Tổng (hộp)", "Người lập", "Ghi chú"].map(
                      (title) => (
                        <th key={title} scope="col" className="p-2">
                          {title}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {row.summaries.map((summary, index) => (
                    <tr key={summary.id ?? index} className="border-t align-top">
                      <td className="p-2">
                        #{summary.id ?? "—"}
                        <p className="mt-1 text-slate-500">{dayLabel(getReportDay(summary.created_at))}</p>
                      </td>
                      {[
                        summary.package_count,
                        summary.boxes_per_package,
                        summary.loose_box_count,
                        summaryQuantity(summary),
                      ].map((value, cell) => (
                        <td key={cell} className="p-2 tabular-nums">
                          {value == null ? "—" : number(Number(value))}
                        </td>
                      ))}
                      <td className="p-2">
                        {summary.createdBy?.name || summary.createdBy?.username || "Chưa ghi nhận"}
                      </td>
                      <td className="max-w-64 whitespace-pre-wrap break-words p-2">{summary.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Lệnh chưa có phiếu tổng kết thành phẩm.</p>
          )}
        </div>
      ) : null}
      <Button variant="outline" size="sm" asChild className="gap-2">
        <Link href={`/product-orders/${encodeURIComponent(row.id)}`}>
          <ExternalLink className="size-3.5" />
          Xem hồ sơ lệnh sản xuất
        </Link>
      </Button>
    </div>
  );
}

function ProductionTable({ rows, hasSummaryData }: { rows: ProductionRow[]; hasSummaryData: boolean }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const activePage = Math.min(page, pageCount);
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (sort === "achievement-low")
          return (
            (a.achievement ?? Infinity) - (b.achievement ?? Infinity) ||
            a.id.localeCompare(b.id, "vi", { numeric: true })
          );
        if (sort === "actual-high")
          return (b.actual ?? -1) - (a.actual ?? -1) || a.id.localeCompare(b.id, "vi", { numeric: true });
        return (b.day ?? "").localeCompare(a.day ?? "") || b.id.localeCompare(a.id, "vi", { numeric: true });
      }),
    [rows, sort],
  );
  const visible = sorted.slice((activePage - 1) * 10, activePage * 10);
  return (
    <ProductionPanel
      title="Chi tiết lệnh sản xuất"
      subtitle="Mở từng lệnh để xem ngày sản xuất, quy cách, kế hoạch, chênh lệch và các phiếu tổng kết. Sản lượng thực tế hiện có cho thành phẩm, theo hộp."
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{number(rows.length)} lệnh phù hợp</p>
        <div className="flex items-center gap-2">
          <Label htmlFor="production-sort" className="text-xs">
            Sắp xếp
          </Label>
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value);
              setPage(1);
              setExpanded(null);
            }}
          >
            <SelectTrigger id="production-sort" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Ngày sản xuất mới nhất</SelectItem>
              <SelectItem value="achievement-low" disabled={!hasSummaryData}>
                Mức đạt kế hoạch thấp nhất
              </SelectItem>
              <SelectItem value="actual-high" disabled={!hasSummaryData}>
                Sản lượng thực tế cao nhất
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <caption className="sr-only">Danh sách lệnh sản xuất và sản lượng</caption>
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              {[
                "Lệnh / Số lô",
                "Sản phẩm",
                "Ngày sản xuất",
                "Trạng thái",
                "Kho",
                "Kế hoạch",
                "Thực tế (hộp)",
                "Đạt kế hoạch",
              ].map((title) => (
                <th key={title} scope="col" className="px-3 py-3 font-semibold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const open = expanded === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="border-t align-top hover:bg-slate-50/60">
                    <td className="px-3 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto gap-1 px-0 text-indigo-700"
                        onClick={() => setExpanded(open ? null : row.id)}
                        aria-expanded={open}
                        aria-controls={`production-detail-${row.id}`}
                        aria-label={`${open ? "Ẩn" : "Xem"} chi tiết lệnh ${row.id}`}
                      >
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}#
                        {row.source.production_order_code || row.id}
                      </Button>
                      <p className="mt-1 text-xs text-slate-500">Lô: {row.lot}</p>
                    </td>
                    <td className="max-w-64 px-3 py-3">
                      <p className="font-medium">{row.product}</p>
                      <p className="mt-1 text-xs text-slate-500">{categoryLabel(row.category)}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {dayLabel(row.day)}
                      {row.dateFallback && row.day ? (
                        <p className="mt-1 text-xs text-slate-400">Theo ngày tạo lệnh</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <StateBadge row={row} />
                    </td>
                    <td className="px-3 py-3">{row.warehouse}</td>
                    <td className="px-3 py-3 tabular-nums">{plannedLabel(row)}</td>
                    <td className="px-3 py-3 tabular-nums">{actualLabel(row, hasSummaryData)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`font-semibold tabular-nums ${row.achievement !== null && row.achievement >= 100 ? "text-emerald-700" : row.achievement !== null && row.achievement < 95 ? "text-amber-700" : "text-slate-600"}`}
                      >
                        {hasSummaryData ? percent(row.achievement) : "—"}
                      </span>
                    </td>
                  </tr>
                  {open ? (
                    <tr id={`production-detail-${row.id}`} className="border-t bg-indigo-50/30">
                      <td colSpan={8}>
                        <OrderDetails row={row} hasSummaryData={hasSummaryData} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  Không có lệnh sản xuất phù hợp bộ lọc.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <p>
          {rows.length
            ? `${(activePage - 1) * 10 + 1}–${Math.min(activePage * 10, rows.length)} / ${number(rows.length)} lệnh`
            : "0 lệnh"}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={activePage === 1}
            onClick={() => {
              setPage(activePage - 1);
              setExpanded(null);
            }}
          >
            Trước
          </Button>
          <span>
            Trang {activePage}/{pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={activePage === pageCount}
            onClick={() => {
              setPage(activePage + 1);
              setExpanded(null);
            }}
          >
            Sau
          </Button>
        </div>
      </div>
    </ProductionPanel>
  );
}

export default function ProductionReport({
  orders,
  range,
}: {
  orders: ReportProductionOrder[];
  range: ProductionRange;
}) {
  const [filters, setFilters] = useState<ProductionFilters>(EMPTY_PRODUCTION_FILTERS);
  const [selectedUnit, setSelectedUnit] = useState("");
  const summaries = useSWR<ProductionSummary[]>(
    API_ROUTES.productionOrders.finishedProductSummaries,
    productOrdersService.fetchFinishedProductSummaries,
  );
  const hasSummaryData = !summaries.isLoading && !summaries.error;
  const summaryMetric = (value: string) => (summaries.isLoading ? "…" : summaries.error ? "—" : value);
  const rows = useMemo(
    () => buildProductionRows(orders, summaries.data ?? EMPTY_SUMMARIES, range),
    [orders, summaries.data, range],
  );
  const productOptions = useMemo(
    () =>
      Array.from(new Map(rows.map((row) => [row.productKey, row.product])), ([value, label]) => ({
        value,
        label,
      })).sort((a, b) => a.label.localeCompare(b.label, "vi")),
    [rows],
  );
  const warehouseOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.warehouse)))
        .sort((a, b) => a.localeCompare(b, "vi"))
        .map((value) => ({ value, label: value })),
    [rows],
  );
  const units = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter((row) => row.status !== "cancelled")
            .map((row) => row.unit)
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    [rows],
  );
  const unit = units.includes(selectedUnit) ? selectedUnit : units.includes("hộp") ? "hộp" : (units[0] ?? "");
  const filtered = useMemo(() => filterProductionRows(rows, filters), [rows, filters]);
  const report = useMemo(() => buildProductionReport(filtered, range, unit), [filtered, range, unit]);
  const setFilter = <K extends keyof ProductionFilters>(key: K, value: ProductionFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const activeFilters = Object.entries(filters).some(([key, value]) =>
    key === "search" ? String(value).trim() !== "" : key === "includeCancelled" ? value : value !== "all",
  );
  return (
    <div className="space-y-4">
      <section aria-label="Bộ lọc báo cáo sản xuất" className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <FilterSelect
            id="production-product"
            label="Sản phẩm"
            value={filters.product}
            onChange={(value) => setFilter("product", value)}
            options={productOptions}
          />
          <FilterSelect
            id="production-category"
            label="Nhóm sản phẩm"
            value={filters.category}
            onChange={(value) => setFilter("category", value)}
            options={[
              { value: "finished", label: "Thành phẩm" },
              { value: "semi", label: "Bán thành phẩm" },
              { value: "unknown", label: "Chưa phân loại" },
            ]}
          />
          <FilterSelect
            id="production-status"
            label="Trạng thái lệnh"
            value={filters.status}
            onChange={(value) => setFilter("status", value)}
            options={PRODUCTION_STATES.map((state) => ({ value: state.key, label: state.label }))}
          />
          <FilterSelect
            id="production-warehouse"
            label="Kho"
            value={filters.warehouse}
            onChange={(value) => setFilter("warehouse", value)}
            options={warehouseOptions}
          />
          <FilterSelect
            id="production-unit"
            label="Đơn vị tổng hợp kế hoạch"
            value={unit}
            onChange={setSelectedUnit}
            options={units.map((value) => ({ value, label: value }))}
            all={false}
          />
          <div className="space-y-2">
            <Label htmlFor="production-search">Tìm lệnh sản xuất</Label>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                id="production-search"
                value={filters.search}
                onChange={(event) => setFilter("search", event.target.value)}
                className="pl-9"
                placeholder="Mã lệnh, sản phẩm, số lô, ghi chú…"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p aria-live="polite" className="text-sm text-slate-500">
              <strong className="text-slate-800">{number(filtered.length)}</strong> / {number(rows.length)} lệnh trong
              kỳ
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={filters.includeCancelled}
                onChange={(event) => setFilter("includeCancelled", event.target.checked)}
                className="size-4 accent-indigo-600"
              />
              Bao gồm lệnh đã hủy
            </label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={!activeFilters}
            onClick={() => setFilters(EMPTY_PRODUCTION_FILTERS)}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Xóa bộ lọc
          </Button>
        </div>
      </section>

      {summaries.error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>Không thể tải tổng kết thành phẩm. Các chỉ số lệnh và kế hoạch vẫn được hiển thị.</p>
          <Button variant="outline" size="sm" onClick={() => void summaries.mutate()}>
            Tải lại tổng kết
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng lệnh sản xuất",
            value: number(report.total),
            hint: `${number(report.finishedCount)} thành phẩm · ${number(report.semiCount)} bán thành phẩm${report.cancelledCount ? ` · ${number(report.cancelledCount)} đã hủy` : ""}`,
            icon: ClipboardList,
            theme: "border-blue-200 bg-blue-50 text-blue-950",
          },
          {
            label: "Sản phẩm có lệnh",
            value: number(report.productCount),
            hint: "Đếm theo mã sản phẩm, mỗi mã một lần",
            icon: Package,
            theme: "border-indigo-200 bg-indigo-50 text-indigo-950",
          },
          {
            label: "Lệnh đang mở",
            value: number(report.openCount),
            hint: "Gồm đã lên kế hoạch và đã phát hành",
            icon: Activity,
            theme: "border-amber-200 bg-amber-50 text-amber-950",
          },
          {
            label: "Tỷ lệ lệnh đã đóng",
            value: percent(report.activeCount ? (report.closedCount / report.activeCount) * 100 : null),
            hint: `${number(report.closedCount)} / ${number(report.activeCount)} lệnh không hủy`,
            icon: CheckCircle2,
            theme: "border-emerald-200 bg-emerald-50 text-emerald-950",
          },
          {
            label: `Số lượng kế hoạch${unit ? ` (${unit})` : ""}`,
            value: unit && report.plannedOrderCount ? number(report.plannedQuantity) : "—",
            hint: `${number(report.plannedOrderCount)} lệnh không hủy, cùng đơn vị đã chọn`,
            icon: Target,
            theme: "border-violet-200 bg-violet-50 text-violet-950",
          },
          {
            label: "Thực tế thành phẩm (hộp)",
            value: summaryMetric(report.summarizedCount ? number(report.actualQuantity) : "—"),
            hint: hasSummaryData
              ? `${number(report.summarizedCount)} / ${number(report.finishedCount)} lệnh có số lượng tổng kết`
              : "Từ tổng kết thành phẩm",
            icon: Factory,
            theme: "border-teal-200 bg-teal-50 text-teal-950",
          },
          {
            label: "Mức đạt kế hoạch thành phẩm",
            value: summaryMetric(percent(report.outputAchievement)),
            hint: `${hasSummaryData ? number(report.comparableCount) : "—"} lệnh có kế hoạch hộp > 0 và có thực tế`,
            icon: TrendingUp,
            theme: "border-sky-200 bg-sky-50 text-sky-950",
          },
          {
            label: "Thành phẩm chưa có tổng kết",
            value: summaryMetric(number(report.pendingSummaryCount)),
            hint: "Lệnh không hủy, chưa có phiếu tổng kết",
            icon: ClipboardList,
            theme: "border-rose-200 bg-rose-50 text-rose-950",
          },
        ].map((metric) => (
          <div key={metric.label} className={`rounded-xl border p-4 ${metric.theme}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{metric.label}</p>
              <metric.icon aria-hidden="true" className="size-5 shrink-0 opacity-70" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">{metric.value}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{metric.hint}</p>
          </div>
        ))}
      </div>

      {filtered.length ? (
        <>
          <ProductionReportCharts report={report} hasSummaryData={hasSummaryData} />
          <ProductionPanel
            title="Tổng hợp theo sản phẩm"
            subtitle={`10 sản phẩm có nhiều lệnh nhất. Kế hoạch chỉ cộng ${unit || "đơn vị đã chọn"}; thực tế thành phẩm luôn tính theo hộp, không quy đổi giữa đơn vị.`}
          >
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    {["Sản phẩm", "Số lệnh", "Lệnh đã đóng", `Kế hoạch (${unit || "—"})`, "Thực tế TP (hộp)"].map(
                      (title) => (
                        <th key={title} scope="col" className="p-3 font-semibold">
                          {title}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {report.products.slice(0, 10).map((product) => (
                    <tr key={product.key} className="border-t">
                      <th scope="row" className="p-3 font-medium">
                        {product.name}
                      </th>
                      <td className="p-3 tabular-nums">{number(product.count)}</td>
                      <td className="p-3 tabular-nums">{number(product.closed)}</td>
                      <td className="p-3 tabular-nums">
                        {unit && product.plannedCount ? number(product.planned) : "—"}
                      </td>
                      <td className="p-3 tabular-nums">
                        {summaryMetric(product.summarizedCount ? number(product.actual) : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ProductionPanel>
          <ProductionPanel
            title="Thông tin cần bổ sung"
            subtitle="Lọc theo ngày sản xuất của lô; thiếu ngày sản xuất dùng ngày tạo lệnh. Lệnh thiếu cả hai ngày chỉ xuất hiện khi chọn tất cả thời gian."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Dùng ngày tạo thay ngày sản xuất", number(report.dateFallbackCount)],
                ["Thiếu ngày hợp lệ", number(report.undatedCount)],
                ["Thiếu số lượng kế hoạch", number(report.missingPlanCount)],
                ["Thiếu đơn vị kế hoạch", number(report.missingUnitCount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">
                    {value}
                    <span className="ml-2 text-xs font-normal text-slate-500">lệnh</span>
                  </p>
                </div>
              ))}
            </div>
            {hasSummaryData && report.incomparableCount > 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                {number(report.incomparableCount)} lệnh có thực tế nhưng không đủ kế hoạch lớn hơn 0 theo hộp để tính tỷ
                lệ đạt.
              </p>
            ) : null}
            {hasSummaryData && report.invalidSummaryCount > 0 ? (
              <p className="mt-2 text-xs text-amber-700">
                {number(report.invalidSummaryCount)} phiếu tổng kết có số lượng không hợp lệ, chưa được cộng vào thực
                tế.
              </p>
            ) : null}
          </ProductionPanel>
        </>
      ) : (
        <div role="status" className="rounded-xl border border-dashed bg-white p-8 text-center">
          <Factory className="mx-auto mb-3 size-8 text-slate-400" />
          <p className="font-medium text-slate-700">Không có lệnh sản xuất phù hợp</p>
          <p className="mt-1 text-sm text-slate-500">Thay đổi khoảng thời gian hoặc bộ lọc để xem dữ liệu.</p>
        </div>
      )}

      <ProductionTable key={JSON.stringify([filters, range])} rows={filtered} hasSummaryData={hasSummaryData} />
    </div>
  );
}
