"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileWarning,
  Package,
  RotateCcw,
  Tags,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReportProductFilter from "./report-product-filter";
import DeviationCalendarHeatmap from "./deviation-calendar-heatmap";
import { getReportDay } from "../report-date";
import {
  buildDeviationReport,
  buildDeviationOrderRateReport,
  DEVIATION_STAGES,
  EMPTY_DEVIATION_FILTERS,
  filterDeviationRows,
  normalizeDeviation,
  type DeviationFilters,
  type DeviationProductionOrder,
  type ReportDeviation,
} from "../deviation-report";

const COLORS = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];
const number = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
const percent = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
const tooltipNumber = (value: unknown, name: unknown) => [number(Number(value)), String(name)];
const shortLabel = (value: string) => (value.length > 24 ? `${value.slice(0, 24)}…` : value);

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <h2 className={`text-base font-semibold text-slate-950${subtitle ? "" : " mb-4"}`}>{title}</h2>
      {subtitle && <p className="mb-4 mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
      {children}
    </section>
  );
}

function Plot({ hasData, children, height = 320 }: { hasData: boolean; children: ReactNode; height?: number }) {
  return (
    <div style={{ height }} className="min-w-0">
      {hasData ? (
        children
      ) : (
        <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
          Chưa có dữ liệu phù hợp để hiển thị biểu đồ.
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
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

export default function DeviationReport({
  deviations,
  productionOrders,
  totalProductionOrders,
  totalProducts,
  range,
}: {
  deviations: ReportDeviation[];
  productionOrders: DeviationProductionOrder[] | null;
  totalProductionOrders: number | "…" | "—";
  totalProducts: number | "…" | "—";
  range: { from: string; to: string } | null;
}) {
  const [filters, setFilters] = useState<DeviationFilters>(EMPTY_DEVIATION_FILTERS);
  const [selectedUnit, setSelectedUnit] = useState("");
  const today = getReportDay(new Date().toISOString())!;
  const rows = useMemo(() => deviations.map((source) => normalizeDeviation(source, today)), [deviations, today]);
  const productOptions = useMemo(
    () =>
      Array.from(new Map(rows.map((row) => [row.productKey, row.product])), ([value, label]) => ({
        value,
        label,
      })).sort((a, b) => a.label.localeCompare(b.label, "vi")),
    [rows],
  );
  const causeOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.cause)))
        .sort((a, b) => a.localeCompare(b, "vi"))
        .map((value) => ({ value, label: value })),
    [rows],
  );
  const filtered = useMemo(() => filterDeviationRows(rows, filters), [rows, filters]);
  const report = useMemo(() => buildDeviationReport(filtered, range), [filtered, range]);
  const orderRateReport = useMemo(
    () => productionOrders === null ? null : buildDeviationOrderRateReport(filtered, productionOrders, range),
    [filtered, productionOrders, range],
  );
  const deviationOrderRate = typeof totalProductionOrders === "number"
    ? totalProductionOrders > 0
      ? `${((report.total / totalProductionOrders) * 100).toLocaleString("vi-VN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} %`
      : "—"
    : totalProductionOrders;
  const affectedOrderRate = typeof totalProductionOrders === "number"
    ? totalProductionOrders > 0
      ? `${((report.affectedOrders / totalProductionOrders) * 100).toFixed(1)}%`
      : "—"
    : totalProductionOrders;
  const affectedProductRate = typeof totalProducts === "number"
    ? totalProducts > 0
      ? percent((report.productCount / totalProducts) * 100)
      : "—"
    : totalProducts;
  const unit = report.quantities.some((item) => item.unit === selectedUnit)
    ? selectedUnit
    : (report.quantities[0]?.unit ?? "");
  const quantity = report.quantities.find((item) => item.unit === unit);
  const quantityPoints = quantity
    ? [
        { name: "Ảnh hưởng", value: quantity.affected },
        { name: "Đã xử lý", value: quantity.handled },
        { name: "Hủy", value: quantity.destroyed },
      ]
    : [];
  const setFilter = (key: keyof DeviationFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const activeFilters = Object.entries(filters).some(([key, value]) =>
    key === "search" ? value.trim() !== "" : value !== "all",
  );
  const timeTick = (key: string) => report.timeline.find((point) => point.key === key)?.label ?? key;
  const timeTooltip = (key: unknown) =>
    report.timeline.find((point) => point.key === String(key))?.tooltipLabel ?? String(key);

  return (
    <div className="relative min-w-0 space-y-4">
      <section aria-label="Bộ lọc báo cáo sai lệch" className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ReportProductFilter
            id="deviation-product"
            value={filters.product}
            onChange={(value) => setFilter("product", value)}
            options={productOptions}
          />
          <FilterSelect
            id="deviation-cause"
            label="Nhóm nguyên nhân"
            value={filters.cause}
            onChange={(value) => setFilter("cause", value)}
            options={causeOptions}
          />
          <FilterSelect
            id="deviation-stage"
            label="Tình trạng hồ sơ"
            value={filters.stage}
            onChange={(value) => setFilter("stage", value)}
            options={DEVIATION_STAGES.map((stage) => ({ value: stage.key, label: stage.label }))}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-slate-500">
            Hiển thị <strong className="text-slate-800">{number(filtered.length)}</strong> / {number(rows.length)} phiếu
            trong kỳ theo ngày bắt đầu của lệnh
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={!activeFilters}
            onClick={() => setFilters(EMPTY_DEVIATION_FILTERS)}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Xóa bộ lọc
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="space-y-3 divide-y divide-blue-200">
            {[
              {
                label: "Tổng số lệnh sản xuất",
                value: typeof totalProductionOrders === "number" ? number(totalProductionOrders) : totalProductionOrders,
                icon: Factory,
                color: "text-blue-950",
              },
              {
                label: "Tổng số sản phẩm",
                value: typeof totalProducts === "number" ? number(totalProducts) : totalProducts,
                icon: Package,
                color: "text-emerald-950",
              },
            ].map((metric) => (
              <div key={metric.label} className={`pt-3 first:pt-0 ${metric.color}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{metric.label}</p>
                  <metric.icon aria-hidden="true" className="size-5 shrink-0 opacity-70" />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
        {[
          {
            label: "Tổng phiếu sai lệch",
            value: number(report.total),
            hint: (
              <>
                <strong className="text-2xl font-extrabold tabular-nums leading-none">{deviationOrderRate}</strong>{" "}
                <span className="text-sm font-semibold leading-snug">Tổng số lệnh sản xuất</span>
              </>
            ),
            hintClassName: "flex flex-col items-start gap-2 rounded-lg bg-amber-200 px-3 py-2.5 text-amber-950 ring-1 ring-inset ring-amber-300",
            icon: AlertTriangle,
            theme: "border-amber-200 bg-amber-50 text-amber-950",
          },
          {
            label: "Lệnh có sai lệch",
            value: number(report.affectedOrders),
            hint: (
              <>
                <strong className="text-2xl font-extrabold tabular-nums leading-none">{affectedOrderRate}</strong>{" "}
                <span className="whitespace-nowrap text-sm font-semibold">tổng số lệnh</span>
              </>
            ),
            hintClassName: "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-rose-200 px-3 py-2.5 text-rose-950 ring-1 ring-inset ring-rose-300",
            icon: FileWarning,
            theme: "border-rose-200 bg-rose-50 text-rose-950",
          },
          {
            label: "Sản phẩm có sai lệch",
            value: number(report.productCount),
            hint: (
              <>
                <strong className="text-2xl font-extrabold tabular-nums leading-none">{affectedProductRate}</strong>{" "}
                <span className="whitespace-nowrap text-sm font-semibold">tổng số sản phẩm</span>
              </>
            ),
            hintClassName: "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-indigo-200 px-3 py-2.5 text-indigo-950 ring-1 ring-inset ring-indigo-300",
            icon: Package,
            theme: "border-indigo-200 bg-indigo-50 text-indigo-950",
          },
          {
            label: "Chưa phân loại nguyên nhân",
            value: number(report.unclassifiedCount),
            hint: (
              <>
                <strong className="text-2xl font-extrabold tabular-nums leading-none">
                  {report.total ? percent((report.unclassifiedCount / report.total) * 100) : "—"}
                </strong>{" "}
                <span className="whitespace-nowrap text-sm font-semibold">tổng phiếu sai lệch</span>
              </>
            ),
            hintClassName: "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-orange-200 px-3 py-2.5 text-orange-950 ring-1 ring-inset ring-orange-300",
            icon: Tags,
            theme: "border-orange-200 bg-orange-50 text-orange-950",
          },
          {
            label: "Chưa có nguyên nhân",
            value: number(report.missingCause),
            hint: (
              <>
                <strong className="text-2xl font-extrabold tabular-nums leading-none">
                  {report.total ? percent((report.missingCause / report.total) * 100) : "—"}
                </strong>{" "}
                <span className="whitespace-nowrap text-sm font-semibold">tổng phiếu sai lệch</span>
              </>
            ),
            hintClassName: "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-yellow-200 px-3 py-2.5 text-yellow-950 ring-1 ring-inset ring-yellow-300",
            icon: FileWarning,
            theme: "border-yellow-200 bg-yellow-50 text-yellow-950",
          },
          {
            label: "Chưa có phương án xử lý",
            value: number(report.unplannedCount),
            hint: (
              <>
                <strong className="text-2xl font-extrabold tabular-nums leading-none">
                  {report.total ? percent((report.unplannedCount / report.total) * 100) : "—"}
                </strong>{" "}
                <span className="whitespace-nowrap text-sm font-semibold">tổng phiếu sai lệch</span>
              </>
            ),
            hintClassName: "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-sky-200 px-3 py-2.5 text-sky-950 ring-1 ring-inset ring-sky-300",
            icon: ClipboardList,
            theme: "border-sky-200 bg-sky-50 text-sky-950",
          },
          {
            label: "Đã ghi nhận kết quả",
            value: number(report.resultCount),
            hint: (
              <>
                <strong className="text-2xl font-extrabold tabular-nums leading-none">
                  {report.total ? percent(report.resultRate) : "—"}
                </strong>{" "}
                <span className="whitespace-nowrap text-sm font-semibold">tổng phiếu sai lệch</span>
              </>
            ),
            hintClassName: "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-emerald-200 px-3 py-2.5 text-emerald-950 ring-1 ring-inset ring-emerald-300",
            icon: CheckCircle2,
            theme: "border-emerald-200 bg-emerald-50 text-emerald-950",
          },
        ].map((metric) => (
          <div key={metric.label} className={`rounded-xl border p-4 ${metric.theme}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{metric.label}</p>
              <metric.icon aria-hidden="true" className="size-5 shrink-0 opacity-70" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">{metric.value}</p>
            <p className={`mt-2 leading-relaxed ${metric.hintClassName ?? "text-xs text-slate-600"}`}>
              {metric.hint}
            </p>
          </div>
        ))}
      </div>

      {report.undatedCount > 0 ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950">
          {number(report.undatedCount)} phiếu thuộc lệnh thiếu ngày bắt đầu hợp lệ: có trong tổng, không có trên biểu đồ
          thời gian.
        </div>
      ) : null}

      {!filtered.length ? (
        <div role="status" className="rounded-xl border border-dashed bg-white p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 size-8 text-slate-400" />
          <p className="font-medium text-slate-700">
            {rows.length ? "Không có sai lệch phù hợp bộ lọc" : "Chưa có sai lệch trong khoảng thời gian đã chọn"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Thay đổi khoảng thời gian hoặc bộ lọc để xem dữ liệu.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel
              title="Xu hướng phát sinh và lũy kế"
              subtitle={`Số phiếu theo ${report.resolutionLabel} bắt đầu của lệnh; đường lũy kế bắt đầu từ đầu kỳ lọc.`}
              className="xl:col-span-2"
            >
              <Plot hasData={report.timeline.length > 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={report.timeline} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="deviation-trend-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="count" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="total"
                      orientation="right"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip formatter={tooltipNumber} labelFormatter={timeTooltip} />
                    <Legend />
                    <Area
                      yAxisId="count"
                      type="monotone"
                      dataKey="count"
                      name="Phiếu phát sinh (trục trái)"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#deviation-trend-fill)"
                    />
                    <Line
                      yAxisId="total"
                      type="monotone"
                      dataKey="cumulative"
                      name="Lũy kế (trục phải)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Plot>
            </Panel>
            <Panel
              title="Cơ cấu nhóm nguyên nhân"
              subtitle="Tỷ trọng số phiếu theo từng nhóm nguyên nhân."
            >
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="mx-auto aspect-square w-full max-w-[280px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={report.causes} dataKey="count" nameKey="name" outerRadius="85%">
                        {report.causes.map((cause, index) => (
                          <Cell key={cause.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${number(Number(value))} phiếu · ${percent((Number(value) / report.total) * 100)}`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0">
                  <ul className="space-y-3">
                    {report.causes.map((cause, index) => (
                      <li
                        key={cause.name}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-slate-100 pb-2 text-xs"
                      >
                        <span className="flex min-w-0 items-start gap-2 text-slate-600">
                          <span
                            className="mt-0.5 size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="min-w-0 break-words">{cause.name}</span>
                        </span>
                        <span className="whitespace-nowrap font-semibold tabular-nums">
                          {number(cause.count)} phiếu · {percent(cause.percentage)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    Chưa phân loại: {number(report.unclassifiedCount)} phiếu. Nhóm này được giữ trong phân tích để phản ánh
                    đầy đủ dữ liệu.
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Cơ cấu tình trạng hồ sơ"
              subtitle="Tỷ trọng phiếu theo mức độ cập nhật phương án và kết quả xử lý."
            >
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="mx-auto w-full max-w-[280px] min-w-0">
                  <Plot hasData={report.total > 0} height={250}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={report.stages.filter((stage) => stage.count > 0)}
                          dataKey="count"
                          nameKey="label"
                          innerRadius="55%"
                          outerRadius="80%"
                          paddingAngle={3}
                        >
                          {report.stages
                            .filter((stage) => stage.count > 0)
                            .map((stage) => (
                              <Cell key={stage.key} fill={stage.color} />
                            ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            `${number(Number(value))} phiếu · ${percent((Number(value) / report.total) * 100)}`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Plot>
                </div>
                <ul className="min-w-0 space-y-3">
                  {report.stages.map((stage) => (
                    <li
                      key={stage.key}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-slate-100 pb-2 text-xs"
                    >
                      <span className="flex min-w-0 items-start gap-2 text-slate-600">
                        <span
                          className="mt-0.5 size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="min-w-0 break-words">{stage.label}</span>
                      </span>
                      <span className="whitespace-nowrap font-semibold tabular-nums">
                        {number(stage.count)} · {percent((stage.count / report.total) * 100)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
            <Panel
              title="10 sản phẩm có nhiều sai lệch nhất"
              subtitle="Xếp hạng theo số phiếu, không phải số lượng sản phẩm ảnh hưởng. Mỗi phiếu được tính một lần."
            >
              <Plot hasData={report.products.length > 0} height={360}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.products.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tickFormatter={shortLabel}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={tooltipNumber} />
                    <Bar dataKey="count" name="Số phiếu sai lệch" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {report.products.slice(0, 10).map((product, index) => (
                        <Cell key={`${product.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Plot>
              <p className="mt-2 text-xs text-slate-500">
                {number(report.productCount)} nhóm sản phẩm có sai lệch trong dữ liệu đang xem.
              </p>
            </Panel>
            <Panel
              title="Tỉ lệ sai lệch và lô có sai lệch theo thời gian"
              subtitle={`Tỉ lệ phiếu sai lệch/lệnh sản xuất, lô có sai lệch/tổng số lô và sản phẩm có sai lệch/tổng số sản phẩm theo ${orderRateReport?.resolutionLabel ?? report.resolutionLabel} bắt đầu của lệnh.`}
              className="xl:col-span-2"
            >
              {orderRateReport === null ? (
                <div role="status" className="flex h-80 items-center justify-center text-sm text-slate-500">
                  {totalProductionOrders === "…" ? "Đang tải dữ liệu lệnh sản xuất…" : "Không thể tải dữ liệu lệnh sản xuất."}
                </div>
              ) : (
                <>
                  <Plot hasData={orderRateReport.points.length > 0} height={344}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={orderRateReport.points} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="key"
                          tickFormatter={(key) => orderRateReport.points.find((point) => point.key === key)?.label ?? key}
                          minTickGap={24}
                          height={56}
                          label={{ value: "Thời gian", position: "insideBottom", offset: 8 }}
                        />
                        <YAxis tickFormatter={percent} width={75} />
                        <Tooltip
                          labelFormatter={(key) => orderRateReport.points.find((point) => point.key === String(key))?.tooltipLabel ?? String(key)}
                          formatter={(value, name, item) => [
                            item.dataKey === "productRate"
                              ? `${percent(Number(value))} (${number(item.payload.affectedProductCount)} / ${number(item.payload.productCount)} sản phẩm)`
                              : percent(Number(value)),
                            name,
                          ]}
                        />
                        <Line
                          type="linear"
                          dataKey="rate"
                          name="Tỉ lệ sai lệch/lệnh sản xuất"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          connectNulls={false}
                        />
                        <Line
                          type="linear"
                          dataKey="lotRate"
                          name="Tỉ lệ lô có sai lệch/tổng số lô"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          connectNulls={false}
                        />
                        <Line
                          type="linear"
                          dataKey="productRate"
                          name="Tỉ lệ sản phẩm có sai lệch/tổng số sản phẩm"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          connectNulls={false}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Plot>
                </>
              )}
            </Panel>
            <Panel
              title="Tình trạng hồ sơ theo kỳ bắt đầu của lệnh"
              subtitle={`Cột chồng theo ${report.resolutionLabel} bắt đầu của lệnh, dùng tình trạng hiện tại của hồ sơ.`}
            >
              <Plot hasData={report.timeline.length > 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={tooltipNumber} labelFormatter={timeTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {DEVIATION_STAGES.map((stage) => (
                      <Bar
                        key={stage.key}
                        dataKey={stage.key}
                        stackId="stage"
                        name={stage.label}
                        fill={stage.color}
                        maxBarSize={48}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Plot>
              <p className="mt-2 text-xs text-slate-500">
                Biểu đồ thể hiện các phiếu của lệnh bắt đầu trong từng kỳ đang có thông tin gì tại thời điểm xem.
              </p>
            </Panel>
            <Panel
              title="Số lượng ảnh hưởng, xử lý và hủy"
              subtitle="Chọn từng đơn vị để xem tổng số lượng đã ghi nhận; các đại lượng có thể chồng lấp và không dùng để tính số lượng còn lại."
            >
              <div className="relative mb-3 flex items-center gap-3">
                <Label htmlFor="deviation-unit">Đơn vị</Label>
                <Select value={unit} onValueChange={setSelectedUnit} disabled={!report.quantities.length}>
                  <SelectTrigger id="deviation-unit" className="w-48">
                    <SelectValue placeholder="Chưa có số lượng" />
                  </SelectTrigger>
                  <SelectContent>
                    {report.quantities.map((item) => (
                      <SelectItem key={item.unit} value={item.unit}>
                        {item.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Plot hasData={quantityPoints.length > 0} height={275}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quantityPoints}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={number} width={85} />
                    <Tooltip formatter={(value) => [`${number(Number(value))} ${unit}`, "Số lượng"]} />
                    <Bar dataKey="value" name="Số lượng" radius={[6, 6, 0, 0]} maxBarSize={70}>
                      {quantityPoints.map((point, index) => (
                        <Cell key={point.name} fill={["#6366f1", "#10b981", "#f43f5e"][index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Plot>
              <p className="mt-2 text-xs text-slate-500">
                Không cộng gộp các đơn vị khác nhau. {number(report.missingQuantity)} phiếu chưa ghi nhận số lượng ảnh
                hưởng.{" "}
                {report.missingUnitCount > 0
                  ? `${number(report.missingUnitCount)} phiếu có số lượng thiếu đơn vị; các số lượng này không được cộng trên biểu đồ.`
                  : ""}
              </p>
            </Panel>
            <Panel
              title="Mật độ sai lệch theo ngày"
              subtitle="Xếp phiếu theo ngày bắt đầu của lệnh sản xuất."
              className="xl:col-span-2"
            >
              <DeviationCalendarHeatmap heatmap={report.heatmap} />
            </Panel>
          </div>

        </>
      )}
    </div>
  );
}
