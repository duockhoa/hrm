"use client";

import type { ReactNode } from "react";
import {
  Area,
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

export default function VialInspectionReportCharts({ report }: { report: Report }) {
  const timeTick = (key: string) => report.timeline.find((point) => point.key === key)?.label ?? key;
  const timeTooltip = (key: unknown) =>
    report.timeline.find((point) => point.key === String(key))?.tooltipLabel ?? String(key);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Xu hướng phiếu soi và lỗi ghi nhận"
          subtitle={`Theo ${report.resolutionLabel} ghi nhận phiếu; số phiếu và tổng lượt lỗi có hai trục riêng.`}
          className="xl:col-span-2"
        >
          <Plot hasData={report.timeline.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={report.timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="vial-inspection-records-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} />
                <YAxis yAxisId="records" allowDecimals={false} />
                <YAxis yAxisId="errors" orientation="right" allowDecimals={false} />
                <Tooltip formatter={tooltipNumber} labelFormatter={timeTooltip} />
                <Legend />
                <Area
                  yAxisId="records"
                  dataKey="count"
                  type="monotone"
                  name="Số phiếu (trục trái)"
                  stroke="#0ea5e9"
                  fill="url(#vial-inspection-records-fill)"
                  strokeWidth={2.5}
                />
                <Line
                  yAxisId="errors"
                  dataKey="errors"
                  type="monotone"
                  name="Lượt lỗi (trục phải)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
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
    </div>
  );
}
