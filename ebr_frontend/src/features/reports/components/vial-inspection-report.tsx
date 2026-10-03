"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Activity,
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileSearch,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import { getReportDay } from "../report-date";
import {
  buildVialInspectionReport,
  buildVialInspectionRows,
  EMPTY_VIAL_FILTERS,
  filterVialInspectionRows,
  VIAL_DEFECTS,
  type ReportVialInspection,
  type VialInspectionRow,
  type VialReportFilters,
  type VialReportRange,
} from "../vial-inspection-report";
import VialInspectionReportCharts from "./vial-inspection-report-charts";
import {
  formatProductionNumber as number,
  formatProductionPercent as percent,
  productionDayLabel as dayLabel,
  ProductionPanel as Panel,
} from "./production-report-charts";

const EMPTY_CHECKS: ReportVialInspection[] = [];
type Report = ReturnType<typeof buildVialInspectionReport>;
const countLabel = (value: number | null) => (value === null ? "Chưa ghi nhận" : number(value));
const resultLabel = (row: VialInspectionRow) =>
  row.result === "none" ? "Không ghi nhận lỗi" : row.result === "defects" ? "Có ghi nhận lỗi" : "Chưa đủ số lượng";
const resultTone = (row: VialInspectionRow) =>
  row.result === "none"
    ? "bg-emerald-50 text-emerald-700"
    : row.result === "defects"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";
const timeLabel = (value: string | null | undefined) => {
  if (!value || !getReportDay(value)) return "Chưa ghi nhận";
  return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

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

function OrderSummaryTable({ orders, onFilter }: { orders: Report["orders"]; onFilter: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(orders.length / 10));
  const activePage = Math.min(page, pageCount);
  return (
    <Panel
      title="Tổng hợp soi lọ theo lệnh / lô"
      subtitle="Cộng các phiếu trong phạm vi bộ lọc; đếm mỗi bao một lần trong từng lệnh. Chọn mã lệnh để lọc toàn bộ báo cáo về lệnh đó."
    >
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <caption className="sr-only">Tổng hợp kết quả soi lọ theo lệnh sản xuất</caption>
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              {[
                "Lệnh / Số lô",
                "Sản phẩm",
                "Số phiếu",
                "Số bao",
                ...VIAL_DEFECTS.map((defect) => defect.label),
                "Tổng lỗi đã nhập",
              ].map((title) => (
                <th key={title} scope="col" className="p-3 font-semibold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice((activePage - 1) * 10, activePage * 10).map((order) => (
              <tr key={order.key} className="border-t align-top">
                <td className="p-3">
                  {order.orderId ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-indigo-700"
                      onClick={() => onFilter(order.orderId!)}
                    >
                      {order.name}
                    </Button>
                  ) : (
                    order.name
                  )}
                </td>
                <td className="max-w-64 p-3 font-medium">{order.product}</td>
                <td className="p-3 tabular-nums">{number(order.records)}</td>
                <td className="p-3 tabular-nums">{number(order.bagCount)}</td>
                {VIAL_DEFECTS.map(({ key }) => (
                  <td key={key} className="p-3 tabular-nums">
                    {number(order[key])}
                  </td>
                ))}
                <td className="p-3 font-semibold tabular-nums">
                  {number(order.errors)}
                  {order.incomplete > 0 ? (
                    <p className="mt-1 text-xs font-normal text-amber-700">{order.incomplete} phiếu chưa đủ số lượng</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>{number(orders.length)} nhóm lệnh / lô</span>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}>
            Trước
          </Button>
          <span>
            Trang {activePage}/{pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={activePage === pageCount}
            onClick={() => setPage(activePage + 1)}
          >
            Sau
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function InspectionTable({ rows }: { rows: VialInspectionRow[] }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [expanded, setExpanded] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const activePage = Math.min(page, pageCount);
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (sort === "errors") return b.knownTotal - a.knownTotal || a.key.localeCompare(b.key);
        if (sort === "bag")
          return (
            (a.orderId ?? "").localeCompare(b.orderId ?? "", "vi", { numeric: true }) ||
            (a.bag ?? Infinity) - (b.bag ?? Infinity)
          );
        return (
          (b.day ?? "").localeCompare(a.day ?? "") ||
          String(b.source.id ?? "").localeCompare(String(a.source.id ?? ""), "vi", { numeric: true })
        );
      }),
    [rows, sort],
  );
  return (
    <Panel
      title="Chi tiết từng phiếu soi lọ"
      subtitle="Xem số bao, bốn nhóm lỗi, người ghi nhận và ghi chú; mở từng phiếu để xem thêm thông tin lệnh và thời điểm cập nhật."
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{number(rows.length)} phiếu phù hợp</p>
        <div className="flex items-center gap-2">
          <Label htmlFor="vial-sort" className="text-xs">
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
            <SelectTrigger id="vial-sort" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Ngày ghi nhận mới nhất</SelectItem>
              <SelectItem value="errors">Số lỗi đã nhập giảm dần</SelectItem>
              <SelectItem value="bag">Lệnh và số bao tăng dần</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <caption className="sr-only">Chi tiết phiếu soi lọ</caption>
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              {[
                "Phiếu / Ngày",
                "Sản phẩm / Lệnh / Lô",
                "Bao số",
                ...VIAL_DEFECTS.map((defect) => defect.label),
                "Tổng lỗi",
                "Ghi nhận",
                "Người lập",
              ].map((title) => (
                <th key={title} scope="col" className="p-3 font-semibold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice((activePage - 1) * 10, activePage * 10).map((row, index) => {
              const open = row.key === expanded;
              const detailId = `vial-inspection-detail-${(activePage - 1) * 10 + index}`;
              return (
                <Fragment key={row.key}>
                  <tr className="border-t align-top hover:bg-slate-50/60">
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto gap-1 px-0 text-indigo-700"
                        onClick={() => setExpanded(open ? null : row.key)}
                        aria-expanded={open}
                        aria-controls={detailId}
                        aria-label={`${open ? "Ẩn" : "Xem"} chi tiết phiếu ${row.source.id ?? index + 1}`}
                      >
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}#
                        {row.source.id ?? "—"}
                      </Button>
                      <p className="mt-1 whitespace-nowrap text-xs text-slate-500">{dayLabel(row.day)}</p>
                    </td>
                    <td className="max-w-64 p-3">
                      <p className="font-medium">{row.product}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Lệnh {row.orderLabel} · Lô {row.lot}
                      </p>
                      {row.cancelled ? <p className="mt-1 text-xs text-rose-600">Lệnh đã hủy</p> : null}
                    </td>
                    <td className="p-3 tabular-nums">{row.bag ?? "—"}</td>
                    {VIAL_DEFECTS.map(({ key }) => (
                      <td key={key} className="p-3 tabular-nums">
                        {countLabel(row.counts[key])}
                      </td>
                    ))}
                    <td className="p-3 font-semibold tabular-nums">
                      {row.total === null ? (
                        <span className="text-xs font-normal text-amber-700">
                          Đã nhập: {number(row.knownTotal)}
                          <br />
                          Chưa đủ dữ liệu
                        </span>
                      ) : (
                        number(row.total)
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${resultTone(row)}`}>
                        {resultLabel(row)}
                      </span>
                    </td>
                    <td className="p-3">{row.creator}</td>
                  </tr>
                  {open ? (
                    <tr id={detailId} className="border-t bg-indigo-50/30">
                      <td colSpan={10}>
                        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                          <div className="md:col-span-2">
                            <p className="text-xs font-semibold text-slate-500">Ghi chú soi lọ</p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                              {row.source.note?.trim() || "Chưa ghi nhận"}
                            </p>
                          </div>
                          <dl className="space-y-2 text-xs">
                            {[
                              ["Ngày tạo phiếu", timeLabel(row.source.created_at)],
                              ["Cập nhật gần nhất", timeLabel(row.source.updated_at)],
                              [
                                "Ngày sản xuất của lô",
                                dayLabel(getReportDay(row.source.productionOrder?.date_manufacture)),
                              ],
                              ["Người ghi nhận", row.creator],
                            ].map(([label, value]) => (
                              <div key={label} className="flex justify-between gap-3">
                                <dt className="text-slate-500">{label}</dt>
                                <dd className="text-right font-medium">{value}</dd>
                              </div>
                            ))}
                          </dl>
                          {row.orderId ? (
                            <div>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/product-orders/${encodeURIComponent(row.orderId)}`}>
                                  Xem hồ sơ lệnh {row.orderLabel}
                                </Link>
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">
                  Không có phiếu soi lọ phù hợp bộ lọc.
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

export default function VialInspectionReport({ range }: { range: VialReportRange }) {
  const [filters, setFilters] = useState<VialReportFilters>(EMPTY_VIAL_FILTERS);
  const checks = useSWR<ReportVialInspection[]>(
    API_ROUTES.productionOrders.allVialInspectionChecks,
    productOrdersService.fetchAllVialInspectionChecks,
  );
  const rows = useMemo(() => buildVialInspectionRows(checks.data ?? EMPTY_CHECKS, range), [checks.data, range]);
  const options = useMemo(() => {
    const unique = (entries: [string, string][]) =>
      Array.from(new Map(entries), ([value, label]) => ({ value, label })).sort((a, b) =>
        a.label.localeCompare(b.label, "vi", { numeric: true }),
      );
    return {
      products: unique(rows.map((row) => [row.productKey, row.product])),
      orders: unique(
        rows.filter((row) => row.orderId !== null).map((row) => [row.orderId!, `${row.orderLabel} · Lô ${row.lot}`]),
      ),
      creators: unique(rows.map((row) => [row.creatorKey, row.creator])),
    };
  }, [rows]);
  const filtered = useMemo(() => filterVialInspectionRows(rows, filters), [rows, filters]);
  const report = useMemo(() => buildVialInspectionReport(filtered, range), [filtered, range]);
  const setFilter = <K extends keyof VialReportFilters>(key: K, value: VialReportFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const activeFilters = Object.entries(filters).some(([key, value]) =>
    key === "search" ? String(value).trim() !== "" : key === "includeCancelled" ? value : value !== "all",
  );
  const tableKey = JSON.stringify([filters, range]);

  if (checks.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  if (checks.error)
    return (
      <div role="alert" className="rounded-lg border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">
        <p>Không thể tải dữ liệu báo cáo soi lọ.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void checks.mutate()}>
          Tải lại dữ liệu
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <section aria-label="Bộ lọc báo cáo soi lọ" className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <FilterSelect
            id="vial-product"
            label="Sản phẩm"
            value={filters.product}
            onChange={(value) => setFilter("product", value)}
            options={options.products}
          />
          <FilterSelect
            id="vial-order"
            label="Lệnh / Lô sản xuất"
            value={filters.order}
            onChange={(value) => setFilter("order", value)}
            options={options.orders}
          />
          <FilterSelect
            id="vial-creator"
            label="Người ghi nhận"
            value={filters.creator}
            onChange={(value) => setFilter("creator", value)}
            options={options.creators}
          />
          <FilterSelect
            id="vial-defect"
            label="Phiếu có nhóm lỗi"
            value={filters.defect}
            onChange={(value) => setFilter("defect", value)}
            options={VIAL_DEFECTS.map((defect) => ({ value: defect.key, label: defect.label }))}
          />
          <FilterSelect
            id="vial-result"
            label="Thông tin ghi nhận"
            value={filters.result}
            onChange={(value) => setFilter("result", value)}
            options={[
              { value: "defects", label: "Có ghi nhận lỗi" },
              { value: "none", label: "Không ghi nhận lỗi" },
              { value: "incomplete", label: "Chưa đủ số lượng" },
            ]}
          />
          <div className="space-y-2">
            <Label htmlFor="vial-search">Tìm phiếu soi lọ</Label>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                id="vial-search"
                className="pl-9"
                value={filters.search}
                onChange={(event) => setFilter("search", event.target.value)}
                placeholder="Mã phiếu, số bao, lô, ghi chú…"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p aria-live="polite" className="text-sm text-slate-500">
              <strong className="text-slate-800">{number(filtered.length)}</strong> / {number(rows.length)} phiếu trong
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
            onClick={() => setFilters(EMPTY_VIAL_FILTERS)}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Xóa bộ lọc
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng phiếu soi lọ",
            value: number(report.total),
            hint: "Theo thời gian và bộ lọc đã chọn",
            icon: ClipboardList,
            theme: "border-blue-200 bg-blue-50 text-blue-950",
          },
          {
            label: "Lệnh có phiếu soi",
            value: number(report.orderCount),
            hint: `${number(report.productCount)} sản phẩm có phiếu soi`,
            icon: FileSearch,
            theme: "border-indigo-200 bg-indigo-50 text-indigo-950",
          },
          {
            label: "Số bao được ghi nhận",
            value: number(report.bagCount),
            hint: "Đếm riêng số bao trong từng lệnh, không cộng mã bao",
            icon: Boxes,
            theme: "border-violet-200 bg-violet-50 text-violet-950",
          },
          {
            label: "Tổng lượt lỗi đã nhập",
            value: number(report.totalErrors),
            hint: "Cộng số lượng bốn nhóm lỗi hợp lệ",
            icon: TriangleAlert,
            theme: "border-rose-200 bg-rose-50 text-rose-950",
          },
          {
            label: "Phiếu có ghi nhận lỗi",
            value: number(report.withDefects),
            hint: "Phiếu đủ dữ liệu, tổng số lỗi > 0",
            icon: TriangleAlert,
            theme: "border-amber-200 bg-amber-50 text-amber-950",
          },
          {
            label: "Phiếu không ghi nhận lỗi",
            value: number(report.withoutDefects),
            hint: "Cả bốn số lượng hợp lệ và bằng 0",
            icon: ClipboardList,
            theme: "border-emerald-200 bg-emerald-50 text-emerald-950",
          },
          {
            label: "Tỷ lệ phiếu ghi nhận lỗi",
            value: percent(report.defectRecordRate),
            hint: `${number(report.withDefects)} / ${number(report.completeCount)} phiếu đủ số lượng`,
            icon: Activity,
            theme: "border-sky-200 bg-sky-50 text-sky-950",
          },
          {
            label: "Lỗi trung bình / phiếu",
            value: report.averageErrors === null ? "—" : number(report.averageErrors),
            hint: "Tính trên phiếu đủ bốn số lượng hợp lệ",
            icon: Activity,
            theme: "border-teal-200 bg-teal-50 text-teal-950",
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.defects.map((defect) => (
          <div key={defect.key} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: defect.color }} />
              <p className="text-sm font-medium text-slate-600">{defect.label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: defect.color }}>
              {number(defect.count)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {percent(report.totalErrors ? (defect.count / report.totalErrors) * 100 : null)} tổng lỗi đã nhập
            </p>
          </div>
        ))}
      </div>

      {filtered.length ? (
        <>
          <VialInspectionReportCharts report={report} />
          <OrderSummaryTable key={tableKey} orders={report.orders} onFilter={(id) => setFilter("order", id)} />
          <Panel
            title="Phạm vi và mức độ đầy đủ của dữ liệu"
            subtitle="Lọc theo ngày tạo phiếu soi lọ; thiếu ngày tạo dùng ngày cập nhật, theo giờ Việt Nam. Tổng lỗi là tổng số lượng đã ghi nhận, có thể gồm nhiều loại lỗi trên cùng một lọ."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Chưa đủ bốn số lượng hợp lệ", report.incompleteCount],
                ["Thiếu ngày hợp lệ", report.undatedCount],
                ["Thiếu số bao hợp lệ", report.missingBagCount],
                ["Thiếu mã lệnh", report.missingOrderCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">
                    {number(Number(value))}
                    <span className="ml-2 text-xs font-normal text-slate-500">phiếu</span>
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Dữ liệu chưa có tổng số lọ đã soi, số lọ đạt hoặc giới hạn chấp nhận. Tỷ lệ phiếu ghi nhận lỗi không phải
              tỷ lệ lọ lỗi hay kết luận đạt/không đạt.
            </p>
            {report.undatedCount > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Phiếu thiếu ngày được tính trong tổng khi chọn tất cả thời gian, không có trên biểu đồ thời gian.
              </p>
            ) : null}
          </Panel>
        </>
      ) : (
        <div role="status" className="rounded-xl border border-dashed bg-white p-8 text-center">
          <FileSearch className="mx-auto mb-3 size-8 text-slate-400" />
          <p className="font-medium text-slate-700">Không có phiếu soi lọ phù hợp</p>
          <p className="mt-1 text-sm text-slate-500">Thay đổi khoảng thời gian hoặc bộ lọc để xem dữ liệu.</p>
        </div>
      )}

      <InspectionTable key={tableKey} rows={filtered} />
    </div>
  );
}
