"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AlertTriangle, ClipboardList, FileWarning, Package, Wrench, type LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ROUTES } from "@/lib/api-routes";
import type { EquipmentIncidentReport } from "@/features/equipment/types";
import { buildProductionSummary } from "../production-summary";
import {
  equipmentService,
  productionOrderDeviationsService,
  productOrdersService,
} from "@/services/index.service";

type ProductionOrder = Record<string, any>;
type ProductionOrderDeviation = Record<string, any>;

const EMPTY_PRODUCTION_ORDERS: ProductionOrder[] = [];
const EMPTY_PRODUCTION_ORDER_DEVIATIONS: ProductionOrderDeviation[] = [];
const EMPTY_EQUIPMENT_INCIDENT_REPORTS: EquipmentIncidentReport[] = [];
const DEVIATION_BAR_COLORS = ["#93c5fd", "#38bdf8", "#0ea5e9", "#0369a1"];

type DateRange = { from: string; to: string };

// Preserve calendar dates; convert timestamps to the reporting timezone.
const getReportDay = (value: unknown): string | null => {
  if (!value) return null;
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text
      ? text
      : null;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const getPresetRange = (preset: string): DateRange => {
  if (preset === "all") return { from: "", to: "" };
  const today = getReportDay(new Date().toISOString())!;
  const date = new Date(`${today}T00:00:00Z`);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  if (preset === "today") return { from: today, to: today };
  if (preset === "last-7-days" || preset === "last-30-days") {
    date.setUTCDate(date.getUTCDate() - (preset === "last-30-days" ? 29 : 6));
    return { from: format(date), to: today };
  }
  if (preset === "last-6-months") {
    return {
      from: format(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 5, 1))),
      to: today,
    };
  }
  if (preset === "last-month") {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    return {
      from: format(new Date(Date.UTC(year, month - 1, 1))),
      to: format(new Date(Date.UTC(year, month, 0))),
    };
  }
  if (preset === "year") {
    return { from: `${date.getUTCFullYear()}-01-01`, to: today };
  }
  return { from: `${today.slice(0, 7)}-01`, to: today };
};

const isInRange = (value: unknown, range: DateRange) => {
  const day = getReportDay(value);
  return day !== null && day >= range.from && day <= range.to;
};

const formatReportDate = (value: string) => value.split("-").reverse().join("/");

const formatNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    maximumFractionDigits: 3,
  });
};

const parseQuantity = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalizedValue = String(value).trim().replace(",", ".");
  const numberValue = Number(normalizedValue);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getFirstValue = (source: ProductionOrder, keys: string[]) => {
  for (const key of keys) {
    const value = source?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
};

const getOrderDate = (order: ProductionOrder) =>
  getFirstValue(order, [
    "date_manufacture",
    "creation_date",
    "created_at",
    "updated_at",
  ]);

const getOrderQuantity = (order: ProductionOrder) =>
  parseQuantity(
    getFirstValue(order, [
      "planned_quantity",
      "planned_quatity",
    ]),
  );

const getProductLabel = (order: ProductionOrder) => {
  const item = order.item ?? {};

  return (
    item.item_name ??
    item.name ??
    order.description ??
    order.item_name ??
    order.item_code ??
    "Không rõ sản phẩm"
  );
};

const getMonthInfo = (value: unknown) => {
  if (!value) {
    return null;
  }

  const day = getReportDay(value);
  if (!day) return null;
  const year = Number(day.slice(0, 4));
  const monthNumber = Number(day.slice(5, 7));
  const month = String(monthNumber).padStart(2, "0");

  return {
    key: `${year}-${month}`,
    label: `T${monthNumber}/${year}`,
  };
};

const buildMonthlyDeviationSummary = (
  deviations: ProductionOrderDeviation[],
) => {
  const monthMap = new Map<string, { key: string; month: string; deviations: number }>();

  deviations.forEach((deviation) => {
    const monthInfo = getMonthInfo(
      getFirstValue(deviation, ["created_at", "updated_at"]),
    );

    if (!monthInfo) {
      return;
    }

    const existing = monthMap.get(monthInfo.key) ?? {
      key: monthInfo.key,
      month: monthInfo.label,
      deviations: 0,
    };

    existing.deviations += 1;
    monthMap.set(monthInfo.key, existing);
  });

  return Array.from(monthMap.values())
    .sort((left, right) => left.key.localeCompare(right.key));
};

const getDeviationBarColor = (value: number, maxValue: number) => {
  if (maxValue <= 0) {
    return DEVIATION_BAR_COLORS[0];
  }

  const ratio = value / maxValue;

  if (ratio >= 0.75) {
    return DEVIATION_BAR_COLORS[3];
  }

  if (ratio >= 0.5) {
    return DEVIATION_BAR_COLORS[2];
  }

  if (ratio >= 0.25) {
    return DEVIATION_BAR_COLORS[1];
  }

  return DEVIATION_BAR_COLORS[0];
};

const METRIC_CARD_THEMES = {
  blue: {
    card: "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/60",
    accent: "bg-blue-500",
    text: "text-blue-950",
    icon: "bg-blue-100 text-blue-600",
  },
  emerald: {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/60",
    accent: "bg-emerald-500",
    text: "text-emerald-950",
    icon: "bg-emerald-100 text-emerald-600",
  },
  amber: {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/60",
    accent: "bg-amber-500",
    text: "text-amber-950",
    icon: "bg-amber-100 text-amber-600",
  },
  rose: {
    card: "border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/60",
    accent: "bg-rose-500",
    text: "text-rose-950",
    icon: "bg-rose-100 text-rose-600",
  },
  violet: {
    card: "border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/60",
    accent: "bg-violet-500",
    text: "text-violet-950",
    icon: "bg-violet-100 text-violet-600",
  },
};

function MetricCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: keyof typeof METRIC_CARD_THEMES;
  icon?: LucideIcon;
}) {
  const theme = tone ? METRIC_CARD_THEMES[tone] : undefined;

  return (
    <div className={`relative overflow-hidden rounded-lg border p-4 shadow-sm ${theme?.card ?? "bg-white"}`}>
      {theme ? <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${theme.accent}`} /> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-medium ${theme?.text ?? "text-gray-500"}`}>{label}</p>
          <p className={`mt-2 ${theme ? `text-3xl font-bold tabular-nums ${theme.text}` : "text-2xl font-semibold text-gray-950"}`}>{value}</p>
        </div>
        {Icon ? (
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${theme?.icon ?? "bg-gray-100 text-gray-600"}`}>
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </div>
        ) : null}
      </div>
      <p className={theme ? "mt-2 text-xs leading-relaxed text-slate-600" : "mt-1 text-xs text-gray-500"}>{hint}</p>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-4 text-left">
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ReportSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return <section className="space-y-3">{children}</section>;
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-md" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-md" />
        <Skeleton className="h-80 rounded-md" />
      </div>
    </div>
  );
}

export default function ReportsDashboard() {
  const [range, setRange] = useState<DateRange>(() => getPresetRange("year"));
  const [preset, setPreset] = useState("year");
  const isAllTime = preset === "all";
  const rangeError = isAllTime
    ? ""
    : !getReportDay(range.from) || !getReportDay(range.to)
    ? "Vui lòng chọn đầy đủ từ ngày và đến ngày."
    : range.from > range.to
      ? "Từ ngày phải nhỏ hơn hoặc bằng đến ngày."
      : "";
  const { data, isLoading, error } = useSWR<ProductionOrder[]>(
    API_ROUTES.productionOrders.base,
    productOrdersService.fetchProductionOrders,
  );
  const {
    data: deviationData,
    isLoading: isDeviationLoading,
    error: deviationError,
  } = useSWR<ProductionOrderDeviation[]>(
    API_ROUTES.productionOrderDeviations.base,
    () => productionOrderDeviationsService.fetchProductionOrderDeviations(),
  );
  const {
    data: incidentData,
    isLoading: isIncidentLoading,
    error: incidentError,
  } = useSWR<EquipmentIncidentReport[]>(
    API_ROUTES.equipment.incidentReports,
    equipmentService.fetchEquipmentIncidentReports,
  );
  const productionOrders = useMemo(
    () => (data ?? EMPTY_PRODUCTION_ORDERS).filter((order) =>
      isAllTime || isInRange(getOrderDate(order), range),
    ),
    [data, range, isAllTime],
  );
  const productionOrderDeviations = useMemo(
    () => (deviationData ?? EMPTY_PRODUCTION_ORDER_DEVIATIONS).filter((deviation) =>
      isAllTime || isInRange(getFirstValue(deviation, ["created_at", "updated_at"]), range),
    ),
    [deviationData, range, isAllTime],
  );
  const equipmentIncidentReports = useMemo(
    () => (incidentData ?? EMPTY_EQUIPMENT_INCIDENT_REPORTS).filter((incident) =>
      isAllTime || isInRange(incident.created_at, range),
    ),
    [incidentData, range, isAllTime],
  );

  const productionSummary = useMemo(
    () => buildProductionSummary(
      productionOrders.map((order) => getReportDay(getOrderDate(order)))
        .filter((day): day is string => day !== null),
      isAllTime ? null : range,
    ),
    [productionOrders, range, isAllTime],
  );
  const monthlyDeviationSummary = useMemo(
    () => buildMonthlyDeviationSummary(productionOrderDeviations),
    [productionOrderDeviations],
  );
  const maxMonthlyDeviation = useMemo(
    () =>
      monthlyDeviationSummary.reduce(
        (maxValue, item) => Math.max(maxValue, item.deviations),
        0,
      ),
    [monthlyDeviationSummary],
  );
  const plannedByUnit = useMemo(() => {
    const units = new Map<string, number>();
    productionOrders.forEach((order) => {
      const unit = String(order.unit || order.item?.unit || "Chưa có đơn vị");
      units.set(unit, (units.get(unit) ?? 0) + getOrderQuantity(order));
    });
    return Array.from(units, ([unit, quantity]) => ({ unit, quantity }));
  }, [productionOrders]);
  const productCount = useMemo(
    () => new Set(productionOrders.map((order) => String(order.item_code ?? order.item?.item_code ?? getProductLabel(order)))).size,
    [productionOrders],
  );
  const affectedOrderCount = new Set(
    productionOrderDeviations.map((deviation) => deviation.production_order_id)
      .filter((id) => id !== undefined && id !== null).map(String),
  ).size;
  const deviationMetric = (value: number) =>
    isDeviationLoading ? "…" : deviationError ? "—" : formatNumber(value);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Loại báo cáo</Label>
            <Select value="overview">
              <SelectTrigger id="report-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="overview">Tổng quan</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-from">Từ ngày</Label>
            <Input
              id="report-from"
              type="date"
              disabled={isAllTime}
              value={range.from}
              max={range.to || undefined}
              aria-invalid={Boolean(rangeError)}
              aria-describedby={rangeError ? "report-range-error" : undefined}
              onChange={(event) => {
                setRange({ ...range, from: event.target.value });
                setPreset("custom");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">Đến ngày</Label>
            <Input
              id="report-to"
              type="date"
              disabled={isAllTime}
              value={range.to}
              min={range.from || undefined}
              aria-invalid={Boolean(rangeError)}
              aria-describedby={rangeError ? "report-range-error" : undefined}
              onChange={(event) => {
                setRange({ ...range, to: event.target.value });
                setPreset("custom");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-preset">Chọn nhanh</Label>
            <Select value={preset} onValueChange={(value) => { setPreset(value); setRange(getPresetRange(value)); }}>
              <SelectTrigger id="report-preset" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" avoidCollisions={false}>
                <SelectItem value="custom" disabled>Tùy chọn</SelectItem>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="today">Hôm nay</SelectItem>
                <SelectItem value="last-7-days">7 ngày gần nhất</SelectItem>
                <SelectItem value="last-30-days">30 ngày gần nhất</SelectItem>
                <SelectItem value="month">Tháng này</SelectItem>
                <SelectItem value="last-month">Tháng trước</SelectItem>
                <SelectItem value="last-6-months">6 tháng gần nhất</SelectItem>
                <SelectItem value="year">Năm nay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {rangeError ? <p id="report-range-error" role="alert" className="mt-2 text-sm text-red-600">{rangeError}</p> : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto bg-gray-50 p-4">
        {!rangeError ? <p className="text-sm text-gray-600">Tổng quan · {isAllTime ? "Tất cả thời gian" : `${formatReportDate(range.from)} – ${formatReportDate(range.to)}`}</p> : null}
        {isLoading && !rangeError ? <ReportSkeleton /> : null}

        {!isLoading && error ? (
          <div className="rounded-md border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
            Không thể tải dữ liệu báo cáo.
          </div>
        ) : null}

        {!isLoading && !error && !rangeError ? (
          <>
            <ReportSection>
              <ChartPanel
                title="Tổng quan"
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    label="Tổng lệnh sản xuất"
                    value={formatNumber(productionOrders.length)}
                    tone="blue"
                    icon={ClipboardList}
                    hint="Trong khoảng thời gian đã chọn"
                  />
                  <MetricCard
                    label="Số sản phẩm"
                    value={formatNumber(productCount)}
                    tone="emerald"
                    icon={Package}
                    hint="Sản phẩm có lệnh trong kỳ"
                  />
                  <MetricCard
                    label="Số sai lệch"
                    value={deviationMetric(productionOrderDeviations.length)}
                    tone="amber"
                    icon={AlertTriangle}
                    hint="Phiếu sai lệch phát sinh trong kỳ"
                  />
                  <MetricCard
                    label="Lệnh có sai lệch"
                    value={deviationMetric(affectedOrderCount)}
                    tone="rose"
                    icon={FileWarning}
                    hint="Số lệnh liên quan đến phiếu sai lệch trong kỳ"
                  />
                  <MetricCard
                    label="Số sự cố thiết bị"
                    value={isIncidentLoading ? "…" : incidentError ? "—" : formatNumber(equipmentIncidentReports.length)}
                    tone="violet"
                    icon={Wrench}
                    hint={incidentError ? "Không thể tải dữ liệu sự cố thiết bị" : "Phiếu sự cố thiết bị được tạo trong kỳ"}
                  />
                </div>
              </ChartPanel>
            </ReportSection>

            <div className="grid gap-4 xl:grid-cols-2">
            <ReportSection>
              <ChartPanel
                title="Số lô sản xuất"
                subtitle={`Số lô sản xuất theo ${productionSummary.resolutionLabel} trong khoảng thời gian đã chọn.`}
              >
                <div className="h-96">
                  {productionSummary.points.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={productionSummary.points}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="key"
                          tickFormatter={(key) => productionSummary.points.find((point) => point.key === key)?.label ?? key}
                          interval="preserveStartEnd"
                          minTickGap={24}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(value) => [
                            formatNumber(value as number),
                            "Số lô",
                          ]}
                          labelFormatter={(key) => productionSummary.points.find((point) => point.key === String(key))?.tooltipLabel ?? String(key)}
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="var(--chart-2)"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          name="Số lô"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      Chưa có dữ liệu lô sản xuất trong khoảng thời gian đã chọn.
                    </div>
                  )}
                </div>
              </ChartPanel>
            </ReportSection>

            <ReportSection>
              {isDeviationLoading ? (
                <Skeleton className="h-96 rounded-md" />
              ) : deviationError ? (
                <div className="rounded-md border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
                  Không thể tải dữ liệu sai lệch.
                </div>
              ) : (
                <ChartPanel
                  title="Số lượng sai lệch theo tháng"
                  subtitle="Đếm số bản ghi sai lệch theo tháng tạo phiếu."
                  className="border-sky-100 bg-sky-50/40"
                >
                  <div className="h-96">
                    {monthlyDeviationSummary.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyDeviationSummary}>
                          <CartesianGrid
                            stroke="#bae6fd"
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                          <Tooltip
                            cursor={{ fill: "rgba(186, 230, 253, 0.32)" }}
                            contentStyle={{
                              borderColor: "#bae6fd",
                              borderRadius: 6,
                              boxShadow: "0 8px 24px rgba(3, 105, 161, 0.12)",
                            }}
                            labelStyle={{ color: "#075985", fontWeight: 600 }}
                            formatter={(value) => [
                              formatNumber(value as number),
                              "Số sai lệch",
                            ]}
                            labelFormatter={(label) => `Tháng ${label}`}
                          />
                          <Bar
                            dataKey="deviations"
                            radius={[4, 4, 0, 0]}
                            name="Số sai lệch"
                          >
                            {monthlyDeviationSummary.map((item) => (
                              <Cell
                                key={item.key}
                                fill={getDeviationBarColor(
                                  item.deviations,
                                  maxMonthlyDeviation,
                                )}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500">
                        Chưa có dữ liệu sai lệch theo tháng.
                      </div>
                    )}
                  </div>
                </ChartPanel>
              )}
            </ReportSection>
            </div>
            <ChartPanel title="Số lượng kế hoạch theo đơn vị" subtitle="Tổng cỡ lô kế hoạch của các lệnh trong kỳ, tách riêng từng đơn vị tính.">
              {plannedByUnit.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {plannedByUnit.map(({ unit, quantity }) => (
                    <MetricCard key={unit} label={unit} value={formatNumber(quantity)} hint="Số lượng kế hoạch" />
                  ))}
                </div>
              ) : <p className="py-6 text-center text-sm text-gray-500">Không có lệnh sản xuất trong khoảng thời gian đã chọn.</p>}
            </ChartPanel>
          </>
        ) : null}
      </div>
    </div>
  );
}
