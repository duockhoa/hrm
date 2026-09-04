"use client";

import { useMemo } from "react";
import useSWR from "swr";
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
import { API_ROUTES } from "@/lib/api-routes";
import {
  productionOrderDeviationsService,
  productOrdersService,
} from "@/services/index.service";

type ProductionOrder = Record<string, any>;
type ProductionOrderDeviation = Record<string, any>;

type MonthlyProduction = {
  key: string;
  month: string;
  quantity: number;
  orders: number;
};

const EMPTY_PRODUCTION_ORDERS: ProductionOrder[] = [];
const EMPTY_PRODUCTION_ORDER_DEVIATIONS: ProductionOrderDeviation[] = [];
const DEVIATION_BAR_COLORS = ["#93c5fd", "#38bdf8", "#0ea5e9", "#0369a1"];

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
      "quantity",
      "completed_quantity",
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

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const monthNumber = date.getMonth() + 1;
  const month = String(monthNumber).padStart(2, "0");

  return {
    key: `${year}-${month}`,
    label: `T${monthNumber}/${year}`,
  };
};

const buildMonthlyProduction = (orders: ProductionOrder[]) => {
  const monthMap = new Map<string, MonthlyProduction>();

  orders.forEach((order) => {
    const monthInfo = getMonthInfo(getOrderDate(order));

    if (!monthInfo) {
      return;
    }

    const existing = monthMap.get(monthInfo.key) ?? {
      key: monthInfo.key,
      month: monthInfo.label,
      quantity: 0,
      orders: 0,
    };

    existing.quantity += getOrderQuantity(order);
    existing.orders += 1;
    monthMap.set(monthInfo.key, existing);
  });

  return Array.from(monthMap.values())
    .sort((left, right) => left.key.localeCompare(right.key))
    .slice(-12);
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
    .sort((left, right) => left.key.localeCompare(right.key))
    .slice(-12);
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

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-950">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
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
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
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
  const productionOrders = useMemo(
    () => data ?? EMPTY_PRODUCTION_ORDERS,
    [data],
  );
  const productionOrderDeviations = useMemo(
    () => deviationData ?? EMPTY_PRODUCTION_ORDER_DEVIATIONS,
    [deviationData],
  );

  const monthlyProduction = useMemo(
    () => buildMonthlyProduction(productionOrders),
    [productionOrders],
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
  const totalQuantity = useMemo(
    () =>
      productionOrders.reduce(
        (total, order) => total + getOrderQuantity(order),
        0,
      ),
    [productionOrders],
  );
  const productCount = useMemo(
    () => new Set(productionOrders.map((order) => String(getProductLabel(order)))).size,
    [productionOrders],
  );
  const averageLotSize =
    productionOrders.length > 0 ? totalQuantity / productionOrders.length : 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-950">Báo cáo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tổng quan dữ liệu lệnh sản xuất theo sản lượng, tháng và trạng thái.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto bg-gray-50 p-4">
        {isLoading ? <ReportSkeleton /> : null}

        {!isLoading && error ? (
          <div className="rounded-md border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
            Không thể tải dữ liệu báo cáo.
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <ReportSection>
              <ChartPanel
                title="Tổng quan"
                subtitle="Các chỉ số chính lấy từ danh sách lệnh sản xuất."
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Tổng lệnh sản xuất"
                    value={formatNumber(productionOrders.length)}
                    hint="Tất cả lệnh trong hệ thống"
                  />
                  <MetricCard
                    label="Tổng số lượng sản phẩm"
                    value={formatNumber(totalQuantity)}
                    hint="Tính theo cỡ lô kế hoạch"
                  />
                  <MetricCard
                    label="Số sản phẩm"
                    value={formatNumber(productCount)}
                    hint="Đếm theo tên/mã sản phẩm"
                  />
                  <MetricCard
                    label="Cỡ lô trung bình"
                    value={formatNumber(averageLotSize)}
                    hint="Tổng số lượng chia số lệnh"
                  />
                </div>
              </ChartPanel>
            </ReportSection>

            <ReportSection>
              <ChartPanel
                title="Số lô theo tháng"
                subtitle="Số lượng lệnh sản xuất phát sinh theo từng tháng."
              >
                <div className="h-96">
                  {monthlyProduction.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyProduction}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(value) => [
                            formatNumber(value as number),
                            "Số lô",
                          ]}
                          labelFormatter={(label) => `Tháng ${label}`}
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
                      Chưa có dữ liệu theo tháng.
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
                          <YAxis tickLine={false} axisLine={false} />
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
          </>
        ) : null}
      </div>
    </div>
  );
}
