"use client";

import type { ReactNode } from "react";
import {
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { buildVialInspectionReport } from "../vial-inspection-report";
import {
  formatProductionNumber as number,
  formatProductionPercent as percent,
  ProductionPanel as Panel,
} from "./production-report-charts";

type Report = ReturnType<typeof buildVialInspectionReport>;
const tooltipNumber = (value: unknown, name: unknown) => [number(Number(value)), String(name)];
const ratePercent = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 4 })}%`;
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

export default function VialInspectionReportCharts({ report, byOrder = false }: { report: Report; byOrder?: boolean }) {
  const chartData = byOrder
    ? [...report.orders]
        .sort((a, b) => a.orderLabel.localeCompare(b.orderLabel, "vi", { numeric: true }))
        .map((point) => ({ ...point, label: point.orderLabel, tooltipLabel: point.name }))
    : report.timeline;
  const points = chartData.map((point) => ({
    key: point.key,
    label: point.label,
    tooltipLabel: point.tooltipLabel,
    errors: point.errors,
    fiber_vial_count: point.fiber_vial_count,
    particulate_count: point.particulate_count,
    damaged_count: point.damaged_count,
    other_defect_count: point.other_defect_count,
    batchSize: point.batchSize,
  }));
  const ratePoints = points.map((point) => {
    const rate = (count: number) => point.batchSize === null ? null : (count / point.batchSize) * 100;
    return {
      ...point,
      errors: rate(point.errors),
      fiber_vial_count: rate(point.fiber_vial_count),
      particulate_count: rate(point.particulate_count),
      damaged_count: rate(point.damaged_count),
      other_defect_count: rate(point.other_defect_count),
    };
  });
  const axisTick = (key: string) => points.find((point) => point.key === key)?.label ?? key;
  const axisTooltip = (key: unknown) =>
    points.find((point) => point.key === String(key))?.tooltipLabel ?? String(key);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Xu hướng lỗi ghi nhận"
          subtitle={byOrder
            ? "Tổng lượt lỗi và số lượng từng nhóm lỗi theo mã lệnh của sản phẩm đã chọn."
            : `Tổng lượt lỗi và số lượng từng nhóm lỗi theo ${report.resolutionLabel} ghi nhận phiếu.`}
          className="xl:col-span-2"
        >
          <Plot hasData={chartData.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={axisTick} minTickGap={24} />
                <YAxis yAxisId="errors" allowDecimals={false} />
                <Tooltip formatter={tooltipNumber} labelFormatter={axisTooltip} />
                <Legend />
                <Line
                  yAxisId="errors"
                  dataKey="errors"
                  type="monotone"
                  name="Tổng lượt lỗi"
                  stroke="#475569"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                {report.defects.map((defect) => (
                  <Line
                    key={defect.key}
                    yAxisId="errors"
                    dataKey={defect.key}
                    type="monotone"
                    name={defect.label}
                    stroke={defect.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </Plot>
        </Panel>
        <Panel
          title="Cơ cấu bốn nhóm lỗi"
          subtitle="Tỷ trọng từng nhóm trên tổng số lỗi đã ghi nhận, không phải tỷ lệ lọ lỗi."
        >
          <Plot hasData={report.totalErrors > 0} height={245}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.defects.filter((defect) => defect.count > 0)}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={3}
                >
                  {report.defects
                    .filter((defect) => defect.count > 0)
                    .map((defect) => (
                      <Cell key={defect.key} fill={defect.color} />
                    ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${number(Number(value))} · ${percent((Number(value) / report.totalErrors) * 100)}`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Plot>
          <ul className="space-y-2">
            {report.defects.map((defect) => (
              <li key={defect.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: defect.color }} />
                  {defect.label}
                </span>
                <strong className="whitespace-nowrap tabular-nums">
                  {number(defect.count)} ·{" "}
                  {percent(report.totalErrors ? (defect.count / report.totalErrors) * 100 : null)}
                </strong>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel
        title="Xu hướng tỷ lệ lỗi soi lọ (%)"
        subtitle={byOrder
          ? "Tổng lượt lỗi và từng nhóm lỗi / cỡ lô của lệnh × 100%. Mốc thiếu cỡ lô hoặc cỡ lô bằng 0 không hiển thị tỷ lệ."
          : `Tổng lượt lỗi và từng nhóm lỗi / tổng cỡ lô các lệnh có phiếu soi trong từng ${report.resolutionLabel} × 100%. Mỗi lệnh chỉ cộng cỡ lô một lần trong mỗi mốc; mốc thiếu cỡ lô hoặc cỡ lô bằng 0 không hiển thị tỷ lệ.`}
      >
        <Plot hasData={ratePoints.some((point) => point.errors !== null)}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={ratePoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" tickFormatter={axisTick} minTickGap={24} />
              <YAxis tickFormatter={ratePercent} width={85} />
              <Tooltip
                formatter={(value, name) => [ratePercent(Number(value)), String(name)]}
                labelFormatter={axisTooltip}
              />
              <Legend />
              <Line
                dataKey="errors"
                type="monotone"
                name="Tổng lượt lỗi"
                stroke="#475569"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              {report.defects.map((defect) => (
                <Line
                  key={defect.key}
                  dataKey={defect.key}
                  type="monotone"
                  name={defect.label}
                  stroke={defect.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </Plot>
      </Panel>
    </div>
  );
}
