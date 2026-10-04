"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
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
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import type { buildProductionReport } from "../production-report";

type Report = ReturnType<typeof buildProductionReport>;
const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];
export const formatProductionNumber = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
export const formatProductionPercent = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
export const productionDayLabel = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "Chưa ghi nhận";
const tooltipNumber = (value: unknown, name: unknown) => [formatProductionNumber(Number(value)), String(name)];
const shortLabel = (value: string) => (value.length > 26 ? `${value.slice(0, 26)}…` : value);

export function ProductionPanel({
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
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {subtitle ? (
        <p className="mb-4 mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </section>
  );
}

function Plot({ hasData, children, height = 320 }: { hasData: boolean; children: ReactNode; height?: number }) {
  return (
    <div className="min-w-0" style={{ height }}>
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

function WarehouseTile({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = "",
  index = 0,
  depth = 0,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  index?: number;
  depth?: number;
}) {
  if (depth !== 1) return null;
  const showLabel = width > 70 && height > 35;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={COLORS[index % COLORS.length]}
        stroke="white"
        strokeWidth={3}
      />
      {showLabel ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={12}
        >
          {name.slice(0, Math.max(4, Math.floor(width / 8)))}
        </text>
      ) : null}
    </g>
  );
}

export default function ProductionReportCharts({
  report,
  hasSummaryData,
}: {
  report: Report;
  hasSummaryData: boolean;
}) {
  const number = formatProductionNumber;
  const timeTick = (key: string) => report.timeline.find((point) => point.key === key)?.label ?? key;
  const timeTooltip = (key: unknown) =>
    report.timeline.find((point) => point.key === String(key))?.tooltipLabel ?? String(key);
  const outputAvailable = hasSummaryData && report.boxActualCount > 0;
  const scatterMax = report.scatter.reduce((max, point) => Math.max(max, point.planned, point.actual), 1);
  const heatMax = report.heatmap.reduce((max, point) => Math.max(max, ...point.weekdays), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <ProductionPanel
          title="Xu hướng số lệnh sản xuất"
          subtitle={`Số lệnh theo ${report.resolutionLabel} bắt đầu và số lệnh lũy kế trong kỳ.`}
          className="xl:col-span-2"
        >
          <Plot hasData={report.timeline.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={report.timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="production-order-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} tickLine={false} axisLine={false} />
                <YAxis yAxisId="orders" allowDecimals={false} />
                <YAxis yAxisId="cumulative" orientation="right" allowDecimals={false} />
                <Tooltip formatter={tooltipNumber} labelFormatter={timeTooltip} />
                <Legend />
                <Area
                  yAxisId="orders"
                  dataKey="count"
                  name="Số lệnh (trục trái)"
                  type="monotone"
                  stroke="#3b82f6"
                  fill="url(#production-order-area)"
                  strokeWidth={2.5}
                />
                <Line
                  yAxisId="cumulative"
                  dataKey="cumulativeOrders"
                  name="Lũy kế (trục phải)"
                  type="monotone"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Plot>
        </ProductionPanel>
        <ProductionPanel title="Cơ cấu trạng thái lệnh" subtitle="Trạng thái hiện tại của các lệnh thuộc kỳ được chọn.">
          <Plot hasData={report.total > 0} height={245}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.states.filter((state) => state.count > 0)}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={3}
                >
                  {report.states
                    .filter((state) => state.count > 0)
                    .map((state) => (
                      <Cell key={state.key} fill={state.color} />
                    ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${number(Number(value))} lệnh · ${formatProductionPercent((Number(value) / report.total) * 100)}`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Plot>
          <ul className="space-y-2">
            {report.states
              .filter((state) => state.count > 0)
              .map((state) => (
                <li key={state.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: state.color }} />
                    {state.label}
                  </span>
                  <strong className="tabular-nums">
                    {number(state.count)} · {formatProductionPercent((state.count / report.total) * 100)}
                  </strong>
                </li>
              ))}
          </ul>
        </ProductionPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProductionPanel
          title="Thành phẩm và bán thành phẩm theo kỳ"
          subtitle={`Cột chồng số lệnh theo ${report.resolutionLabel}; phân loại sản phẩm theo danh mục lệnh hiện có.`}
        >
          <Plot hasData={report.timeline.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipNumber} labelFormatter={timeTooltip} />
                <Legend />
                <Bar dataKey="finished" name="Thành phẩm" stackId="category" fill="#6366f1" maxBarSize={50} />
                <Bar dataKey="semi" name="Bán thành phẩm" stackId="category" fill="#0ea5e9" maxBarSize={50} />
                {report.timeline.some((point) => point.unknown > 0) ? (
                  <Bar dataKey="unknown" name="Chưa phân loại" stackId="category" fill="#94a3b8" maxBarSize={50} />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </Plot>
          <p className="mt-2 text-xs text-slate-500">
            Số lượng lệnh phản ánh phân bố sản xuất; mỗi lệnh được đếm một lần.
          </p>
        </ProductionPanel>
        <ProductionPanel
          title="10 sản phẩm có nhiều lệnh nhất"
          subtitle="Xếp hạng theo số lệnh, không cộng gộp số lượng khác đơn vị."
        >
          <Plot hasData={report.products.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.products.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 15, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={165} tickFormatter={shortLabel} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipNumber} />
                <Bar dataKey="count" name="Số lệnh" radius={[0, 4, 4, 0]} maxBarSize={27}>
                  {report.products.slice(0, 10).map((product, index) => (
                    <Cell key={product.key} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Plot>
        </ProductionPanel>
        <ProductionPanel
          title="Sản lượng thành phẩm: kế hoạch và thực tế"
          subtitle={`So sánh theo ${report.resolutionLabel} bắt đầu của lệnh. Chỉ lấy lệnh thành phẩm có kế hoạch theo hộp; thực tế cộng các phiếu tổng kết cùng lệnh.`}
        >
          <Plot hasData={report.boxPlanCount > 0 && report.timeline.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.timeline} margin={{ top: 8, right: 8, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} />
                <YAxis tickFormatter={number} width={85} />
                <Tooltip
                  formatter={(value, name) => [`${number(Number(value))} hộp`, name]}
                  labelFormatter={timeTooltip}
                />
                <Legend />
                <Bar dataKey="planned" name="Kế hoạch (hộp)" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                {outputAvailable ? (
                  <Bar
                    dataKey="actual"
                    name="Thực tế đã ghi nhận (hộp)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </Plot>
          <p className="mt-2 text-xs text-slate-500">
            {number(report.boxPlanCount)} lệnh có kế hoạch theo hộp;{" "}
            {hasSummaryData
              ? `${number(report.boxActualCount)} lệnh có sản lượng thực tế trong nhóm này. Lệnh chưa có tổng kết vẫn nằm trong kế hoạch.`
              : "Chưa tải được dữ liệu thực tế."}
          </p>
        </ProductionPanel>
        <ProductionPanel
          title="Lũy kế sản lượng thành phẩm"
          subtitle="Diện tích thể hiện kế hoạch và thực tế đã ghi nhận từ đầu kỳ, trên cùng nhóm lệnh có kế hoạch theo hộp."
        >
          <Plot hasData={report.boxPlanCount > 0 && report.timeline.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.timeline} margin={{ top: 8, right: 8, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} />
                <YAxis tickFormatter={number} width={85} />
                <Tooltip
                  formatter={(value, name) => [`${number(Number(value))} hộp`, name]}
                  labelFormatter={timeTooltip}
                />
                <Legend />
                <Area
                  dataKey="cumulativePlanned"
                  name="Kế hoạch lũy kế"
                  type="monotone"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
                {outputAvailable ? (
                  <Area
                    dataKey="cumulativeActual"
                    name="Thực tế lũy kế"
                    type="monotone"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </Plot>
          <p className="mt-2 text-xs text-slate-500">
            Tổng kết được gắn với kỳ bắt đầu của lệnh; lũy kế không thể hiện ngày nhập phiếu hoặc ngày hoàn tất lệnh.
          </p>
        </ProductionPanel>
        <ProductionPanel
          title="Phân bố mức đạt kế hoạch của lô"
          subtitle="Chỉ tính lệnh thành phẩm có kế hoạch lớn hơn 0 theo hộp và có số lượng thực tế hợp lệ."
        >
          <Plot hasData={hasSummaryData && report.comparableCount > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.achievement}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipNumber} />
                <Bar dataKey="count" name="Số lô" radius={[5, 5, 0, 0]} maxBarSize={60}>
                  {report.achievement.map((point, index) => (
                    <Cell key={point.name} fill={["#f43f5e", "#f59e0b", "#38bdf8", "#10b981", "#6366f1"][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Plot>
          <p className="mt-2 text-xs text-slate-500">
            {hasSummaryData
              ? `${number(report.comparableCount)} lô đủ dữ liệu để so sánh; ${number(report.pendingSummaryCount)} lệnh thành phẩm chưa có tổng kết.`
              : "Dữ liệu tổng kết chưa sẵn sàng."}{" "}
            Mức đạt kế hoạch không biểu thị trạng thái đóng lệnh.
          </p>
        </ProductionPanel>
        <ProductionPanel
          title="Tương quan kế hoạch và thực tế từng lô"
          subtitle="Mỗi điểm là một lệnh thành phẩm. Điểm trên đường chéo có thực tế cao hơn kế hoạch; rê chuột để xem lô và sản phẩm."
        >
          <Plot hasData={hasSummaryData && report.scatter.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 18, left: 10, bottom: 22 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="planned"
                  name="Kế hoạch"
                  domain={[0, scatterMax]}
                  tickFormatter={number}
                  label={{ value: "Kế hoạch (hộp)", position: "bottom", offset: 5 }}
                />
                <YAxis
                  type="number"
                  dataKey="actual"
                  name="Thực tế"
                  domain={[0, scatterMax]}
                  tickFormatter={number}
                  width={85}
                />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: scatterMax, y: scatterMax },
                  ]}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as Report["scatter"][number] | undefined;
                    return active && point ? (
                      <div className="max-w-72 rounded-lg border bg-white p-3 text-xs shadow-lg">
                        <p className="font-semibold">{point.product}</p>
                        <p className="mt-1">
                          Lệnh #{point.id} · Lô {point.lot}
                        </p>
                        <p className="mt-2">Kế hoạch: {number(point.planned)} hộp</p>
                        <p>Thực tế: {number(point.actual)} hộp</p>
                        <p>Đạt kế hoạch: {formatProductionPercent(point.achievement)}</p>
                      </div>
                    ) : null;
                  }}
                />
                <Scatter data={report.scatter} name="Lô thành phẩm" fill="#6366f1" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </Plot>
          <p className="mt-2 text-xs text-slate-500">Hai trục cùng thang đo. Đường chéo biểu thị thực tế = kế hoạch.</p>
        </ProductionPanel>
        <ProductionPanel
          title="Phân bố lệnh theo kho"
          subtitle="Biểu đồ ô cây: diện tích mỗi ô tỷ lệ với số lệnh tại kho, gồm nhóm chưa ghi nhận kho."
        >
          <Plot hasData={report.warehouses.length > 0} height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={report.warehouses}
                dataKey="count"
                nameKey="name"
                stroke="white"
                content={<WarehouseTile />}
                isAnimationActive={false}
              >
                <Tooltip formatter={(value, name) => [`${number(Number(value))} lệnh`, name]} />
              </Treemap>
            </ResponsiveContainer>
          </Plot>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {report.warehouses.map((warehouse, index) => (
              <span key={warehouse.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {warehouse.name}: <strong>{number(warehouse.count)}</strong>
              </span>
            ))}
          </div>
        </ProductionPanel>
        <ProductionPanel
          title="Mật độ sản xuất theo thứ trong tuần"
          subtitle={`Bản đồ nhiệt đếm lệnh theo ${report.resolutionLabel} và thứ của ngày bắt đầu. Ô đậm hơn biểu thị nhiều lệnh hơn.`}
        >
          {report.heatmap.length ? (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[420px] text-center text-xs">
                  <caption className="sr-only">Số lệnh theo kỳ và thứ trong tuần</caption>
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
                          {report.resolutionLabel === "ngày" ? productionDayLabel(point.key) : point.label}
                        </th>
                        {point.weekdays.map((count, index) => (
                          <td key={index} className="p-1">
                            <div
                              className="rounded p-2 font-medium tabular-nums"
                              title={`${point.tooltipLabel} · ${["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"][index]}: ${count} lệnh`}
                              style={{
                                backgroundColor: count
                                  ? `rgba(14, 165, 233, ${0.15 + (count / heatMax) * 0.85})`
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
                    style={{ backgroundColor: ratio ? `rgba(14, 165, 233, ${0.15 + ratio * 0.85})` : "#f1f5f9" }}
                  />
                ))}
                <span>{number(heatMax)} lệnh</span>
              </div>
            </>
          ) : (
            <Plot hasData={false}>{null}</Plot>
          )}
        </ProductionPanel>
        <ProductionPanel
          title="Trạng thái lệnh theo kỳ bắt đầu"
          subtitle="Cột chồng giúp theo dõi trạng thái hiện tại của lệnh trong từng kỳ bắt đầu."
          className="xl:col-span-2"
        >
          <Plot hasData={report.timeline.length > 0} height={290}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipNumber} labelFormatter={timeTooltip} />
                <Legend />
                {report.states.map((state) =>
                  state.count > 0 ? (
                    <Bar
                      key={state.key}
                      dataKey={`status${state.key[0].toUpperCase()}${state.key.slice(1)}`}
                      name={state.label}
                      stackId="status"
                      fill={state.color}
                      maxBarSize={50}
                    />
                  ) : null,
                )}
              </BarChart>
            </ResponsiveContainer>
          </Plot>
        </ProductionPanel>
      </div>
    </div>
  );
}
