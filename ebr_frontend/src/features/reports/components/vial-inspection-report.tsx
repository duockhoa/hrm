"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Boxes,
  FileSearch,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReportProductFilter from "./report-product-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import {
  buildVialInspectionReport,
  buildVialInspectionRows,
  EMPTY_VIAL_FILTERS,
  filterVialInspectionRows,
  VIAL_DEFECTS,
  type ReportVialInspection,
  type VialReportFilters,
  type VialReportRange,
} from "../vial-inspection-report";
import VialInspectionReportCharts from "./vial-inspection-report-charts";
import {
  formatProductionNumber as number,
  formatProductionPercent as percent,
} from "./production-report-charts";

const EMPTY_CHECKS: ReportVialInspection[] = [];
type Report = ReturnType<typeof buildVialInspectionReport>;
const SUMMARY_CARD_WIDTH =
  "min-w-0 w-full sm:w-[calc((100%_-_0.75rem)/2)] lg:w-[calc((100%_-_1.5rem)/3)] 2xl:w-[calc((100%_-_3.75rem)/6)]";

function VialInspectionSummary({ report }: { report: Report }) {
  const metrics = [
    {
      label: "Lệnh có phiếu soi",
      value: number(report.orderCount),
      hint: `${number(report.productCount)} sản phẩm có phiếu soi`,
      icon: FileSearch,
      color: undefined,
      theme: "border-indigo-200 bg-indigo-50 text-indigo-950",
    },
    {
      label: "Số bao được ghi nhận",
      value: number(report.bagCount),
      hint: "Đếm riêng số bao trong từng lệnh, không cộng mã bao",
      icon: Boxes,
      color: undefined,
      theme: "border-violet-200 bg-violet-50 text-violet-950",
    },
    ...report.defects.map((defect) => ({
      label: defect.label,
      value: number(defect.count),
      hint: `${percent(report.totalErrors ? (defect.count / report.totalErrors) * 100 : null)} tổng lỗi đã nhập`,
      icon: undefined,
      color: defect.color,
      theme: "border-slate-200 bg-white text-slate-600",
    })),
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {metrics.map((metric) => (
        <div key={metric.label} className={`${SUMMARY_CARD_WIDTH} rounded-xl border p-4 ${metric.theme}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {metric.color && (
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: metric.color }} />
              )}
              <p className="text-sm font-medium">{metric.label}</p>
            </div>
            {metric.icon && <metric.icon aria-hidden="true" className="size-5 shrink-0 opacity-70" />}
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color: metric.color }}>
            {metric.value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{metric.hint}</p>
        </div>
      ))}
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
    };
  }, [rows]);
  const filtered = useMemo(() => filterVialInspectionRows(rows, filters), [rows, filters]);
  const report = useMemo(() => buildVialInspectionReport(filtered, range), [filtered, range]);
  const setFilter = (key: "product" | "defect", value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const activeFilters = filters.product !== "all" || filters.defect !== "all";

  if (checks.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className={`${SUMMARY_CARD_WIDTH} h-28 rounded-xl`} />
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
        <div className="grid gap-3 sm:grid-cols-2">
          <ReportProductFilter
            id="vial-product"
            value={filters.product}
            onChange={(value) => setFilter("product", value)}
            options={options.products}
          />
          <FilterSelect
            id="vial-defect"
            label="Nhóm lỗi"
            value={filters.defect}
            onChange={(value) => setFilter("defect", value)}
            options={VIAL_DEFECTS.map((defect) => ({ value: defect.key, label: defect.label }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-slate-500">
            <strong className="text-slate-800">{number(filtered.length)}</strong> / {number(rows.length)} phiếu trong
            kỳ
          </p>
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

      <VialInspectionSummary report={report} />

      {filtered.length ? (
        <VialInspectionReportCharts report={report} />
      ) : (
        <div role="status" className="rounded-xl border border-dashed bg-white p-8 text-center">
          <FileSearch className="mx-auto mb-3 size-8 text-slate-400" />
          <p className="font-medium text-slate-700">Không có phiếu soi lọ phù hợp</p>
          <p className="mt-1 text-sm text-slate-500">Thay đổi khoảng thời gian hoặc bộ lọc để xem dữ liệu.</p>
        </div>
      )}
    </div>
  );
}
