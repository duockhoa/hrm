"use client";

import type { ReactNode } from "react";
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
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VIAL_DEFECTS, type buildVialInspectionReport } from "../vial-inspection-report";
import {
  formatProductionNumber as number,
  formatProductionPercent as percent,
  productionDayLabel as dayLabel,
  ProductionPanel as Panel,
} from "./production-report-charts";

type Report = ReturnType<typeof buildVialInspectionReport>;
const tooltipNumber = (value: unknown, name: unknown) => [number(Number(value)), String(name)];
const shortLabel = (value: string) => (value.length > 26 ? `${value.slice(0, 26)}…` : value);
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
  const heatPeak = report.heatmap.reduce((max, point) => Math.max(max, ...point.weekdays), 0);
  const heatMax = Math.max(1, heatPeak);
  const productComposition = report.products
    .filter((product) => product.errors > 0)
    .slice(0, 10)
    .map((product) => ({
      ...product,
      ...Object.fromEntries(VIAL_DEFECTS.map(({ key }) => [key, (product[key] / product.errors) * 100])),
    }));

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
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Pareto nhóm lỗi soi lọ"
          subtitle="Nhóm lỗi sắp theo số lượng giảm dần; đường biểu thị tỷ trọng lũy kế, mốc 80% hỗ trợ chọn nhóm cần xem xét."
        >
          <Plot hasData={report.totalErrors > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={report.pareto}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis yAxisId="errors" allowDecimals={false} />
                <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "Tỷ trọng lũy kế" ? percent(Number(value)) : number(Number(value)),
                    name,
                  ]}
                />
                <Legend />
                <ReferenceLine yAxisId="percent" y={80} stroke="#f59e0b" strokeDasharray="5 5" />
                <Bar yAxisId="errors" dataKey="count" name="Số lỗi" radius={[5, 5, 0, 0]} maxBarSize={65}>
                  {report.pareto.map((defect) => (
                    <Cell key={defect.key} fill={defect.color} />
                  ))}
                </Bar>
                <Line yAxisId="percent" dataKey="cumulative" name="Tỷ trọng lũy kế" stroke="#334155" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Plot>
        </Panel>
        <Panel
          title="Diễn biến từng nhóm lỗi"
          subtitle={`Cột chồng số lỗi theo ${report.resolutionLabel} tạo phiếu; các kỳ không phát sinh được giữ bằng 0.`}
        >
          <Plot hasData={report.timeline.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={timeTick} minTickGap={24} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipNumber} labelFormatter={timeTooltip} />
                <Legend />
                {VIAL_DEFECTS.map((defect) => (
                  <Bar
                    key={defect.key}
                    dataKey={defect.key}
                    name={defect.label}
                    stackId="defects"
                    fill={defect.color}
                    maxBarSize={50}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Plot>
        </Panel>
        <Panel
          title="10 sản phẩm ghi nhận nhiều lỗi nhất"
          subtitle="Xếp theo tổng số lỗi đã nhập. Số lượng này phụ thuộc quy mô kiểm tra, không dùng để so sánh tỷ lệ lỗi sản phẩm."
        >
          <Plot hasData={report.products.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.products.slice(0, 10)}
                layout="vertical"
                margin={{ top: 8, right: 15, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={165} tickFormatter={shortLabel} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipNumber} />
                <Bar dataKey="errors" name="Lượt lỗi ghi nhận" fill="#6366f1" radius={[0, 5, 5, 0]} maxBarSize={27} />
              </BarChart>
            </ResponsiveContainer>
          </Plot>
        </Panel>
        <Panel
          title="10 lệnh / lô có nhiều lỗi nhất"
          subtitle="Cột chồng thể hiện nhóm lỗi trong từng lệnh sản xuất; lô cùng số nhưng khác lệnh được giữ riêng."
        >
          <Plot hasData={report.orders.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.orders.slice(0, 10)}
                layout="vertical"
                margin={{ top: 8, right: 15, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={165} tickFormatter={shortLabel} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipNumber} />
                <Legend />
                {VIAL_DEFECTS.map((defect) => (
                  <Bar
                    key={defect.key}
                    dataKey={defect.key}
                    name={defect.label}
                    stackId="defects"
                    fill={defect.color}
                    maxBarSize={27}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Plot>
        </Panel>
        <Panel
          title="Cơ cấu lỗi theo sản phẩm"
          subtitle="Cột 100% so sánh tỷ trọng bốn nhóm lỗi trong từng sản phẩm, lấy tối đa 10 sản phẩm có nhiều lỗi nhất."
        >
          <Plot hasData={productComposition.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productComposition} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <YAxis type="category" dataKey="name" width={165} tickFormatter={shortLabel} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value, name) => [percent(Number(value)), name]} />
                <Legend />
                {VIAL_DEFECTS.map((defect) => (
                  <Bar
                    key={defect.key}
                    dataKey={defect.key}
                    name={defect.label}
                    stackId="share"
                    fill={defect.color}
                    maxBarSize={27}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Plot>
        </Panel>
        <Panel
          title="Phân bố số lỗi trên mỗi phiếu"
          subtitle="Mỗi phiếu được xếp vào một nhóm theo tổng bốn loại lỗi; chỉ tính phiếu đầy đủ các số lượng hợp lệ."
        >
          <Plot hasData={report.completeCount > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.histogram}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  label={{ value: "Số lỗi / phiếu", position: "insideBottom", offset: -2 }}
                  height={45}
                />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipNumber} />
                <Bar dataKey="count" name="Số phiếu" radius={[5, 5, 0, 0]} maxBarSize={60}>
                  {report.histogram.map((point, index) => (
                    <Cell key={point.name} fill={["#10b981", "#38bdf8", "#f59e0b", "#fb923c", "#f43f5e"][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Plot>
          <p className="mt-2 text-xs text-slate-500">
            {number(report.incompleteCount)} phiếu thiếu hoặc có số lượng không hợp lệ chưa được xếp nhóm.
          </p>
        </Panel>
        <Panel
          title="Phân bố phiếu theo người ghi nhận"
          subtitle="Số phiếu đã nhập, tối đa 10 người có nhiều phiếu nhất; thể hiện khối lượng ghi nhận dữ liệu."
        >
          <Plot hasData={report.creators.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.creators.slice(0, 10)}
                layout="vertical"
                margin={{ top: 8, right: 15, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={135} tickFormatter={shortLabel} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipNumber} />
                <Bar dataKey="records" name="Số phiếu" fill="#0ea5e9" radius={[0, 5, 5, 0]} maxBarSize={27} />
              </BarChart>
            </ResponsiveContainer>
          </Plot>
        </Panel>
        <Panel
          title="Tương quan lọ có sợi và hỏng"
          subtitle="Mỗi điểm là một phiếu soi lọ. Trục ngang: số lọ có sợi; trục dọc: số lượng hỏng. Rê chuột để xem phiếu và bao."
        >
          <Plot hasData={report.scatter.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, left: 5, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="fiber"
                  name="Lọ có sợi"
                  allowDecimals={false}
                  label={{ value: "Lọ có sợi", position: "bottom", offset: 5 }}
                />
                <YAxis type="number" dataKey="damaged" name="Hỏng" allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as Report["scatter"][number] | undefined;
                    return active && point ? (
                      <div className="max-w-72 rounded-lg border bg-white p-3 text-xs shadow-lg">
                        <p className="font-semibold">{point.product}</p>
                        <p className="mt-1">
                          Phiếu #{point.id ?? "—"} · Lô {point.lot} · Bao {point.bag ?? "—"}
                        </p>
                        <p className="mt-2">Lọ có sợi: {number(point.fiber)}</p>
                        <p>Hỏng: {number(point.damaged)}</p>
                        <p>Tổng lỗi: {point.total === null ? "Chưa đủ dữ liệu" : number(point.total)}</p>
                        <p className="mt-1 text-slate-500">{point.creator}</p>
                      </div>
                    ) : null;
                  }}
                />
                <Scatter data={report.scatter} name="Phiếu soi lọ" fill="#6366f1" fillOpacity={0.65} />
              </ScatterChart>
            </ResponsiveContainer>
          </Plot>
        </Panel>
        <Panel
          title="Mật độ lỗi theo thứ trong tuần"
          subtitle={`Bản đồ nhiệt tổng lượt lỗi theo ${report.resolutionLabel} tạo phiếu và thứ trong tuần, theo giờ Việt Nam.`}
          className="xl:col-span-2"
        >
          {report.heatmap.length ? (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[420px] text-center text-xs">
                  <caption className="sr-only">Tổng lỗi ghi nhận theo kỳ và thứ trong tuần</caption>
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
                              title={`${point.tooltipLabel} · ${["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"][index]}: ${count} lỗi`}
                              style={{
                                backgroundColor: count
                                  ? `rgba(99, 102, 241, ${0.15 + (count / heatMax) * 0.85})`
                                  : "#f1f5f9",
                                color: count / heatMax >= 0.5 ? "white" : "#334155",
                              }}
                            >
                              {number(count)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-right text-xs text-slate-500">
                Ô càng đậm, số lỗi càng nhiều · Mức cao nhất: {number(heatPeak)} lỗi
              </p>
            </>
          ) : (
            <Plot hasData={false}>{null}</Plot>
          )}
        </Panel>
      </div>
    </div>
  );
}
