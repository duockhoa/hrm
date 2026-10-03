"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileWarning,
  Package,
  RotateCcw,
  Search,
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
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getReportDay } from "../report-date";
import {
  buildDeviationReport,
  DEVIATION_STAGES,
  deviationQuantity,
  EMPTY_DEVIATION_FILTERS,
  filterDeviationRows,
  normalizeDeviation,
  reportText,
  type DeviationFilters,
  type DeviationRow,
  type ReportDeviation,
} from "../deviation-report";

const COLORS = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];
const number = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
const percent = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
const dayLabel = (value: string | null) => (value ? value.split("-").reverse().join("/") : "Chưa ghi nhận");
const tooltipNumber = (value: unknown, name: unknown) => [number(Number(value)), String(name)];
const shortLabel = (value: string) => (value.length > 24 ? `${value.slice(0, 24)}…` : value);
const quantityLabel = (value: unknown, unit: unknown) => {
  const amount = deviationQuantity(value);
  return amount === null ? "Chưa ghi nhận" : `${number(amount)} ${reportText(unit) || "(chưa rõ đơn vị)"}`;
};

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mb-4 mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p>
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

function StageBadge({ stage }: { stage: DeviationRow["stage"] }) {
  const meta = DEVIATION_STAGES.find((item) => item.key === stage)!;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
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
    <div className="min-w-0 space-y-2">
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

function Details({ row }: { row: DeviationRow }) {
  const source = row.source;
  return (
    <div className="grid gap-5 p-4 md:grid-cols-2 xl:grid-cols-3">
      {[
        ["Nội dung sai lệch", source.deviation_content],
        ["Nguyên nhân", source.cause],
        ["Phương án xử lý", source.handling_plan],
        ["Kết quả xử lý", source.handling_result],
      ].map(([label, value]) => (
        <div key={label}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
            {reportText(value) || "Chưa ghi nhận"}
          </p>
        </div>
      ))}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Số lượng</p>
        <dl className="space-y-2 text-sm">
          {[
            ["Ảnh hưởng", quantityLabel(source.affected_quantity, source.affected_quantity_unit)],
            ["Đã xử lý", quantityLabel(source.handled_quantity, source.handled_quantity_unit)],
            ["Hủy", quantityLabel(source.destroyed_quantity, source.destroyed_quantity_unit)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Thông tin hồ sơ</p>
        <dl className="space-y-2 text-sm">
          {[
            ["Mã lệnh", row.orderId ?? "Chưa ghi nhận"],
            ["Người báo cáo", row.reporter],
            ["Người phê duyệt được ghi nhận", row.approver],
            ["Cập nhật gần nhất", dayLabel(getReportDay(source.updated_at))],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function DeviationTable({ rows }: { rows: DeviationRow[] }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const activePage = Math.min(page, pageCount);
  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          (b.day ?? "").localeCompare(a.day ?? "") ||
          String(b.source.id ?? "").localeCompare(String(a.source.id ?? ""), "vi", { numeric: true }),
      ),
    [rows],
  );
  const visible = sorted.slice((activePage - 1) * 10, activePage * 10);
  return (
    <Panel
      title="Danh sách sai lệch chi tiết"
      subtitle="Mở từng phiếu để xem nội dung, nguyên nhân, phương án, kết quả xử lý và thông tin người liên quan."
    >
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <caption className="sr-only">Danh sách {rows.length} phiếu sai lệch phù hợp bộ lọc</caption>
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              {[
                "Phiếu / Ngày",
                "Sản phẩm / Số lô",
                "Nội dung sai lệch",
                "Nhóm nguyên nhân",
                "Tình trạng hồ sơ",
                "SL ảnh hưởng",
              ].map((title) => (
                <th key={title} scope="col" className="px-3 py-3 font-semibold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const key = `${row.source.id ?? "row"}-${(activePage - 1) * 10 + index}`;
              const open = expanded === key;
              return (
                <Fragment key={key}>
                  <tr className="border-t align-top hover:bg-slate-50/60">
                    <td className="px-3 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto gap-1 px-0 text-indigo-700"
                        onClick={() => setExpanded(open ? null : key)}
                        aria-expanded={open}
                        aria-controls={`deviation-detail-${key}`}
                        aria-label={`${open ? "Ẩn" : "Xem"} chi tiết phiếu ${row.source.id ?? index + 1}`}
                      >
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}#
                        {row.source.id ?? "—"}
                      </Button>
                      <p className="mt-1 whitespace-nowrap text-xs text-slate-500">{dayLabel(row.day)}</p>
                    </td>
                    <td className="max-w-64 px-3 py-3">
                      <p className="font-medium">{row.product}</p>
                      <p className="mt-1 text-xs text-slate-500">Lô: {row.lot}</p>
                    </td>
                    <td className="max-w-72 px-3 py-3">
                      <p className="line-clamp-3 whitespace-pre-wrap break-words">
                        {reportText(row.source.deviation_content) || "Chưa ghi nhận"}
                      </p>
                    </td>
                    <td className="px-3 py-3">{row.cause}</td>
                    <td className="px-3 py-3">
                      <StageBadge stage={row.stage} />
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {quantityLabel(row.source.affected_quantity, row.source.affected_quantity_unit)}
                    </td>
                  </tr>
                  {open ? (
                    <tr id={`deviation-detail-${key}`} className="border-t bg-indigo-50/30">
                      <td colSpan={6}>
                        <Details row={row} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Không có phiếu sai lệch phù hợp bộ lọc.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <p>
          {rows.length
            ? `${(activePage - 1) * 10 + 1}–${Math.min(activePage * 10, rows.length)} / ${number(rows.length)} phiếu`
            : "0 phiếu"}
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
    </Panel>
  );
}

export default function DeviationReport({
  deviations,
  range,
}: {
  deviations: ReportDeviation[];
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
  const heatMax = Math.max(1, ...report.heatmap.flatMap((point) => point.weekdays));
  const timeTick = (key: string) => report.timeline.find((point) => point.key === key)?.label ?? key;
  const timeTooltip = (key: unknown) =>
    report.timeline.find((point) => point.key === String(key))?.tooltipLabel ?? String(key);

  return (
    <div className="space-y-4">
      <section aria-label="Bộ lọc báo cáo sai lệch" className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            id="deviation-product"
            label="Sản phẩm"
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
          <div className="space-y-2">
            <Label htmlFor="deviation-search">Tìm phiếu sai lệch</Label>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-slate-400" />
              <Input
                id="deviation-search"
                className="pl-9"
                value={filters.search}
                onChange={(event) => setFilter("search", event.target.value)}
                placeholder="Mã phiếu, lô, nội dung, người báo cáo…"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-slate-500">
            Hiển thị <strong className="text-slate-800">{number(filtered.length)}</strong> / {number(rows.length)} phiếu
            trong kỳ
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          {
            label: "Tổng phiếu sai lệch",
            value: number(report.total),
            hint: "Phiếu phù hợp thời gian và bộ lọc",
            icon: AlertTriangle,
            theme: "border-amber-200 bg-amber-50 text-amber-950",
          },
          {
            label: "Lệnh có sai lệch",
            value: number(report.affectedOrders),
            hint: "Đếm từng mã lệnh một lần",
            icon: FileWarning,
            theme: "border-rose-200 bg-rose-50 text-rose-950",
          },
          {
            label: "Sản phẩm liên quan",
            value: number(report.productCount),
            hint: "Nhóm theo mã sản phẩm nếu có",
            icon: Package,
            theme: "border-indigo-200 bg-indigo-50 text-indigo-950",
          },
          {
            label: "Chưa có kết quả",
            value: number(report.pendingCount),
            hint: "Gồm chưa có / đã có phương án",
            icon: ClipboardList,
            theme: "border-sky-200 bg-sky-50 text-sky-950",
          },
          {
            label: "Đã ghi nhận kết quả",
            value: number(report.resultCount),
            hint: "Có nội dung kết quả xử lý",
            icon: CheckCircle2,
            theme: "border-emerald-200 bg-emerald-50 text-emerald-950",
          },
          {
            label: "Tỷ lệ có kết quả",
            value: report.total ? percent(report.resultRate) : "—",
            hint: "Phiếu có kết quả / tổng phiếu",
            icon: CheckCircle2,
            theme: "border-violet-200 bg-violet-50 text-violet-950",
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

      <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950">
        Tình trạng hồ sơ được suy ra từ phương án và kết quả đã nhập; “đã ghi nhận kết quả” không xác nhận phiếu đã được
        phê duyệt hoặc đóng.
        {report.undatedCount > 0 ? (
          <p className="mt-1">
            {number(report.undatedCount)} phiếu thiếu ngày hợp lệ: có trong tổng và bảng chi tiết, không có trên biểu đồ
            thời gian.
          </p>
        ) : null}
      </div>

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
              subtitle={`Số phiếu phát sinh theo ${report.resolutionLabel}; đường lũy kế bắt đầu từ đầu kỳ lọc.`}
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
              title="Cơ cấu tình trạng hồ sơ"
              subtitle="Tỷ trọng phiếu theo mức độ cập nhật phương án và kết quả xử lý."
            >
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
              <ul className="space-y-2">
                {report.stages.map((stage) => (
                  <li key={stage.key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.label}
                    </span>
                    <span className="whitespace-nowrap font-semibold tabular-nums">
                      {number(stage.count)} · {percent((stage.count / report.total) * 100)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Pareto nhóm nguyên nhân"
              subtitle="Cột: số phiếu theo nhóm nguyên nhân, giảm dần. Đường: tỷ lệ lũy kế; mốc 80% giúp xác định nhóm cần ưu tiên."
            >
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(450, report.causes.length * 100) }}>
                  <Plot hasData={report.causes.length > 0} height={360}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={report.causes} margin={{ top: 8, right: 8, bottom: 35, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickFormatter={shortLabel}
                          angle={-20}
                          textAnchor="end"
                          height={70}
                          interval={0}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis yAxisId="count" allowDecimals={false} />
                        <YAxis
                          yAxisId="percent"
                          orientation="right"
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            name === "Tỷ lệ lũy kế" ? percent(Number(value)) : `${number(Number(value))} phiếu`,
                            name,
                          ]}
                        />
                        <Legend />
                        <ReferenceLine yAxisId="percent" y={80} stroke="#f59e0b" strokeDasharray="5 5" />
                        <Bar
                          yAxisId="count"
                          dataKey="count"
                          name="Số phiếu"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={55}
                        />
                        <Line
                          yAxisId="percent"
                          dataKey="cumulative"
                          name="Tỷ lệ lũy kế"
                          stroke="#f43f5e"
                          strokeWidth={2}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Plot>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Chưa phân loại: {number(report.unclassifiedCount)} phiếu. Nhóm này được giữ trong phân tích để phản ánh
                đầy đủ dữ liệu.
              </p>
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
              title="Tình trạng hồ sơ theo kỳ phát sinh"
              subtitle={`Cột chồng theo ${report.resolutionLabel} tạo phiếu, dùng tình trạng hiện tại của hồ sơ.`}
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
                Biểu đồ thể hiện các phiếu tạo trong từng kỳ đang có thông tin gì tại thời điểm xem.
              </p>
            </Panel>
            <Panel
              title="Số lượng ảnh hưởng, xử lý và hủy"
              subtitle="Chọn từng đơn vị để xem tổng số lượng đã ghi nhận; các đại lượng có thể chồng lấp và không dùng để tính số lượng còn lại."
            >
              <div className="mb-3 flex items-center gap-3">
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
              title="Tuổi hồ sơ chưa có kết quả"
              subtitle={`Số ngày từ ngày ghi nhận đến hôm nay (${dayLabel(today)}), chỉ tính phiếu chưa có kết quả xử lý.`}
            >
              <Plot hasData={report.pendingCount > report.unknownAgeCount}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.ages}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={tooltipNumber} />
                    <Bar dataKey="count" name="Phiếu chưa có kết quả" radius={[5, 5, 0, 0]} maxBarSize={60}>
                      {report.ages.map((point, index) => (
                        <Cell key={point.name} fill={["#bae6fd", "#38bdf8", "#fbbf24", "#fb923c", "#f43f5e"][index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Plot>
              <p className="mt-2 text-xs text-slate-500">
                Tuổi lớn nhất:{" "}
                {report.pendingCount > report.unknownAgeCount ? `${number(report.oldestPending)} ngày` : "—"}.{" "}
                {report.unknownAgeCount > 0 ? `${number(report.unknownAgeCount)} phiếu thiếu ngày hợp lệ.` : ""} Tuổi hồ
                sơ không phải thời gian hoàn tất hay chỉ số quá hạn.
              </p>
            </Panel>
            <Panel
              title="Mật độ phát sinh theo thứ trong tuần"
              subtitle={`Bản đồ nhiệt theo ${report.resolutionLabel} tạo phiếu và thứ trong tuần. Ô càng đậm, số phiếu càng nhiều.`}
            >
              {report.heatmap.length ? (
                <>
                  <div className="max-h-80 overflow-auto rounded-lg border">
                    <table className="w-full min-w-[420px] text-center text-xs">
                      <caption className="sr-only">Số phiếu theo kỳ phát sinh và thứ trong tuần</caption>
                      <thead className="sticky top-0 z-[1] bg-slate-50">
                        <tr>
                          <th scope="col" className="p-2 text-left">
                            Kỳ
                          </th>
                          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                            <th scope="col" key={day} className="p-2">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.heatmap.map((point) => (
                          <tr key={point.key}>
                            <th
                              scope="row"
                              className="whitespace-nowrap p-2 text-left font-medium text-slate-600"
                              title={point.tooltipLabel}
                            >
                              {report.resolutionLabel === "ngày" ? dayLabel(point.key) : point.label}
                            </th>
                            {point.weekdays.map((count, index) => (
                              <td key={index} className="p-1">
                                <div
                                  className="rounded p-2 font-medium tabular-nums"
                                  title={`${point.tooltipLabel} · ${["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"][index]}: ${count} phiếu`}
                                  style={{
                                    backgroundColor: count
                                      ? `rgba(79, 70, 229, ${0.15 + (count / heatMax) * 0.85})`
                                      : "#f1f5f9",
                                    color: count / heatMax >= 0.5 ? "white" : "#334155",
                                  }}
                                >
                                  {count}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-500">
                    <span>0</span>
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                      <span
                        key={ratio}
                        className="h-3 w-5 rounded-sm"
                        style={{ backgroundColor: ratio ? `rgba(79, 70, 229, ${0.15 + ratio * 0.85})` : "#f1f5f9" }}
                      />
                    ))}
                    <span>{number(heatMax)} phiếu</span>
                  </div>
                </>
              ) : (
                <Plot hasData={false}>{null}</Plot>
              )}
            </Panel>
          </div>

          <Panel
            title="Mức độ đầy đủ của dữ liệu"
            subtitle="Các chỉ số dưới đây giúp ưu tiên bổ sung thông tin để phân tích nguyên nhân và tác động chính xác hơn."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Thiếu nguyên nhân", report.missingCause],
                ["Chưa phân loại nguyên nhân", report.unclassifiedCount],
                ["Thiếu số lượng ảnh hưởng", report.missingQuantity],
                ["Thiếu ngày hợp lệ", report.undatedCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
                    {number(Number(value))}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      phiếu · {percent((Number(value) / report.total) * 100)}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
      <DeviationTable key={JSON.stringify([filters, range])} rows={filtered} />
    </div>
  );
}
