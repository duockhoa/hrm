"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Factory,
  Package,
  RotateCcw,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReportProductFilter from "./report-product-filter";
import ProductionReportProductLines from "./production-report-product-lines";
import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import {
  buildProductionReport,
  buildProductionRows,
  EMPTY_PRODUCTION_FILTERS,
  filterProductionRows,
  PRODUCTION_STATES,
  type ProductionFilters,
  type ProductionRange,
  type ProductionSummary,
  type ReportProductionOrder,
} from "../production-report";
import ProductionReportCharts, {
  formatProductionNumber as number,
  formatProductionPercent as percent,
  ProductionPanel,
} from "./production-report-charts";

const EMPTY_SUMMARIES: ProductionSummary[] = [];
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
  const productLineOptions = useMemo(
    () =>
      Array.from(new Map(rows.map((row) => [row.productLineKey, row.productLine])), ([value, label]) => ({
        value,
        label,
      })).sort((a, b) => a.label.localeCompare(b.label, "vi")),
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
          <ReportProductFilter
            id="production-product"
            value={filters.product}
            onChange={(value) => setFilter("product", value)}
            options={productOptions}
          />
          <FilterSelect
            id="production-product-line"
            label="Dòng sản phẩm"
            value={filters.productLine}
            onChange={(value) => setFilter("productLine", value)}
            options={productLineOptions}
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
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p aria-live="polite" className="text-sm text-slate-500">
              <strong className="text-slate-800">{number(filtered.length)}</strong> / {number(rows.length)} lệnh trong
              kỳ theo ngày bắt đầu của lệnh
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
          <ProductionReportProductLines
            report={report}
            unit={unit}
            hasSummaryData={hasSummaryData}
            summaryLoading={summaries.isLoading}
            selectedLine={filters.productLine}
            onSelectLine={(value) => setFilter("productLine", value)}
          />
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
        </>
      ) : (
        <div role="status" className="rounded-xl border border-dashed bg-white p-8 text-center">
          <Factory className="mx-auto mb-3 size-8 text-slate-400" />
          <p className="font-medium text-slate-700">Không có lệnh sản xuất phù hợp</p>
          <p className="mt-1 text-sm text-slate-500">Thay đổi khoảng thời gian hoặc bộ lọc để xem dữ liệu.</p>
        </div>
      )}
    </div>
  );
}
