"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PRODUCTION_STATES, type buildProductionReport } from "../production-report";
import {
  formatProductionNumber as number,
  formatProductionPercent as percent,
  ProductionPanel,
} from "./production-report-charts";

type Report = ReturnType<typeof buildProductionReport>;
const STATUS_FIELDS = {
  planned: "plannedOrders",
  released: "releasedOrders",
  closed: "closed",
  cancelled: "cancelled",
  other: "otherOrders",
} as const;
const shortLabel = (value: string) => (value.length > 28 ? `${value.slice(0, 28)}…` : value);

export default function ProductionReportProductLines({
  report,
  unit,
  hasSummaryData,
  summaryLoading,
  selectedLine,
  onSelectLine,
}: {
  report: Report;
  unit: string;
  hasSummaryData: boolean;
  summaryLoading: boolean;
  selectedLine: string;
  onSelectLine: (value: string) => void;
}) {
  const lines = report.productLines;
  const statusLines = lines.slice(0, 10);
  const comparableLines = lines
    .filter((line) => line.comparableCount > 0)
    .sort((a, b) => b.comparablePlanned - a.comparablePlanned)
    .slice(0, 10);
  const comparableCount = lines.reduce((sum, line) => sum + line.comparableCount, 0);
  const showCancelled = lines.some((line) => line.cancelled > 0);
  const summaryMetric = (value: string) => (summaryLoading ? "…" : hasSummaryData ? value : "—");
  const outputMessage = summaryLoading
    ? "Đang tải tổng kết thành phẩm…"
    : !hasSummaryData
      ? "Chưa tải được tổng kết thành phẩm để so sánh theo dòng sản phẩm."
      : "Chưa có lệnh thành phẩm đủ kế hoạch theo hộp và số lượng thực tế để so sánh.";

  return (
    <section aria-label="Báo cáo theo dòng sản phẩm" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Dòng sản phẩm có lệnh",
            value: number(report.productLineCount),
            hint: "Các dòng đã được ghi nhận trong bộ lọc hiện tại",
          },
          {
            label: "Lệnh chưa ghi nhận dòng sản phẩm",
            value: number(report.missingProductLineCount),
            hint: "Được hiển thị riêng để bổ sung thông tin",
          },
          {
            label: "Lệnh đủ dữ liệu so sánh theo dòng",
            value: summaryMetric(number(comparableCount)),
            hint: "Thành phẩm không hủy, kế hoạch hộp > 0 và có thực tế",
          },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <p className="text-sm font-medium text-indigo-950">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-indigo-950">{metric.value}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{metric.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProductionPanel
          title="Trạng thái lệnh theo dòng sản phẩm"
          subtitle="10 dòng có nhiều lệnh nhất trong bộ lọc hiện tại; mỗi lệnh được đếm một lần."
        >
          <div className="h-[360px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusLines} layout="vertical" margin={{ top: 5, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={175} tickFormatter={shortLabel} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value, name) => [`${number(Number(value))} lệnh`, name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {PRODUCTION_STATES.map((state) =>
                  statusLines.some((line) => line[STATUS_FIELDS[state.key]] > 0) ? (
                    <Bar
                      key={state.key}
                      dataKey={STATUS_FIELDS[state.key]}
                      name={state.label}
                      stackId="line-status"
                      fill={state.color}
                      maxBarSize={27}
                    />
                  ) : null,
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ProductionPanel>
        <ProductionPanel
          title="Kế hoạch và thực tế thành phẩm theo dòng"
          subtitle="10 dòng có kế hoạch so sánh lớn nhất. Hai cột chỉ cộng cùng các lệnh không hủy có kế hoạch hộp > 0 và có thực tế."
        >
          <div className="h-[360px] min-w-0">
            {hasSummaryData && comparableLines.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparableLines}
                  layout="vertical"
                  margin={{ top: 5, right: 12, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={number} />
                  <YAxis type="category" dataKey="name" width={175} tickFormatter={shortLabel} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      const line = payload?.[0]?.payload as Report["productLines"][number] | undefined;
                      return active && line ? (
                        <div className="max-w-72 rounded-lg border bg-white p-3 text-xs shadow-lg">
                          <p className="font-semibold">{line.name}</p>
                          <p className="mt-2">Kế hoạch: {number(line.comparablePlanned)} hộp</p>
                          <p>Thực tế: {number(line.comparableActual)} hộp</p>
                          <p>Đạt kế hoạch: {percent(line.outputAchievement)}</p>
                          <p className="mt-1 text-slate-500">{number(line.comparableCount)} lệnh đủ dữ liệu</p>
                        </div>
                      ) : null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="comparablePlanned" name="Kế hoạch (hộp)" fill="#6366f1" maxBarSize={17} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="comparableActual" name="Thực tế (hộp)" fill="#10b981" maxBarSize={17} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div role="status" className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                {outputMessage}
              </div>
            )}
          </div>
        </ProductionPanel>
      </div>

      <ProductionPanel
        title="Tổng hợp theo dòng sản phẩm"
        subtitle={`Tất cả ${number(lines.length)} dòng/nhóm trong bộ lọc. Kế hoạch cộng theo ${unit || "đơn vị đã chọn"}; thực tế thành phẩm theo hộp. Chọn tên dòng để lọc báo cáo.`}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {[
                  "Dòng sản phẩm",
                  "Sản phẩm",
                  "Số lệnh",
                  "Đang mở",
                  "Đã đóng",
                  ...(showCancelled ? ["Đã hủy"] : []),
                  `Kế hoạch (${unit || "—"})`,
                  "Thực tế TP (hộp)",
                  "Đạt kế hoạch",
                ].map((title) => (
                  <th key={title} scope="col" className="p-3 font-semibold">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key} className="border-t align-top hover:bg-slate-50/60">
                  <th scope="row" className="max-w-64 p-3 font-medium">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto justify-start whitespace-normal p-0 text-left text-indigo-700"
                      aria-pressed={selectedLine === line.key}
                      aria-label={`Lọc theo dòng sản phẩm ${line.name}`}
                      onClick={() => onSelectLine(selectedLine === line.key ? "all" : line.key)}
                    >
                      {line.name}
                    </Button>
                  </th>
                  <td className="p-3 tabular-nums">{number(line.productCount)}</td>
                  <td className="p-3 tabular-nums">{number(line.count)}</td>
                  <td className="p-3 tabular-nums">{number(line.open)}</td>
                  <td className="p-3 tabular-nums">{number(line.closed)}</td>
                  {showCancelled ? <td className="p-3 tabular-nums">{number(line.cancelled)}</td> : null}
                  <td className="p-3 tabular-nums">
                    {unit && line.plannedCount > 0 ? number(line.planned) : "—"}
                    {line.plannedCount > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">{number(line.plannedCount)} lệnh cùng đơn vị</p>
                    ) : null}
                  </td>
                  <td className="p-3 tabular-nums">
                    {summaryMetric(line.summarizedCount > 0 ? number(line.actual) : "—")}
                    {hasSummaryData && line.summarizedCount > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">{number(line.summarizedCount)} lệnh có thực tế</p>
                    ) : null}
                  </td>
                  <td className="p-3 tabular-nums">
                    <span className="font-semibold">{summaryMetric(percent(line.outputAchievement))}</span>
                    {hasSummaryData && line.comparableCount > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">{number(line.comparableCount)} lệnh so sánh</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Mức đạt kế hoạch chỉ tính trên cùng nhóm lệnh thành phẩm có kế hoạch hộp &gt; 0 và có thực tế, không bao gồm
          lệnh hủy. Nhóm chưa ghi nhận dòng sản phẩm được hiển thị riêng.
        </p>
      </ProductionPanel>
    </section>
  );
}
