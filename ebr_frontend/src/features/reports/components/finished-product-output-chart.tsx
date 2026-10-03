"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import {
  buildFinishedProductOutput,
  type FinishedProductLot,
  type FinishedProductOutputSummary,
} from "../finished-product-output";

const formatQuantity = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });

export default function FinishedProductOutputChart({
  range,
}: {
  range: { from: string; to: string } | null;
}) {
  const lots = useSWR<FinishedProductLot[]>(
    API_ROUTES.productionOrders.finishedProducts,
    productOrdersService.fetchFinishedProducts,
  );
  const summaries = useSWR<FinishedProductOutputSummary[]>(
    API_ROUTES.productionOrders.finishedProductSummaries,
    productOrdersService.fetchFinishedProductSummaries,
  );
  const report = useMemo(
    () => buildFinishedProductOutput(lots.data ?? [], summaries.data ?? [], range),
    [lots.data, summaries.data, range],
  );

  if (lots.error || summaries.error) {
    return (
      <div role="alert" className="rounded-md border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
        Không thể tải báo cáo sản lượng thành phẩm. Vui lòng thử lại sau.
      </div>
    );
  }
  if (lots.isLoading || summaries.isLoading) return <Skeleton className="h-[520px] rounded-md" />;

  return (
    <section className="rounded-md border border-emerald-100 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-gray-950">Sản lượng thành phẩm</h2>
      <p className="mt-1 text-sm text-gray-500">
        So sánh sản lượng kế hoạch từ lệnh thành phẩm và sản lượng thực tế từ tổng kết thành phẩm, theo {report.resolutionLabel} sản xuất của lô.
        Lô chưa có ngày sản xuất dùng ngày tạo lô. Loại trừ lô đã hủy.
      </p>
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        {[
          { label: "Sản lượng kế hoạch", value: report.totalPlannedQuantity },
          { label: "Sản lượng thực tế (hộp)", value: report.totalQuantity },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="text-sm text-gray-600">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">{formatQuantity(metric.value)}</p>
          </div>
        ))}
      </div>
      {report.undatedLotCount > 0 ? (
        <p className="mb-3 text-sm text-amber-700">
          Có {formatQuantity(report.undatedLotCount)} lô không có ngày hợp lệ, được tính trong tổng sản lượng nhưng không hiển thị trên biểu đồ thời gian.
        </p>
      ) : null}
      <div className="h-80">
        {report.lotCount > 0 && report.points.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.points} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="key"
                tickFormatter={(key) => report.points.find((point) => point.key === key)?.label ?? key}
                interval="preserveStartEnd"
                minTickGap={24}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tickFormatter={formatQuantity} allowDecimals={false} width={85} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value, name) => [formatQuantity(Number(value)), name]}
                labelFormatter={(key) => report.points.find((point) => point.key === String(key))?.tooltipLabel ?? String(key)}
                cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
              />
              <Legend />
              <Bar dataKey="plannedQuantity" name="Sản lượng kế hoạch" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={56} />
              <Bar dataKey="actualQuantity" name="Sản lượng thực tế" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">
            Chưa có dữ liệu lô thành phẩm để hiển thị sản lượng trong khoảng thời gian đã chọn.
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Kế hoạch = tổng số lượng kế hoạch trên lệnh thành phẩm. Thực tế (hộp) = số kiện × số hộp/kiện + số hộp lẻ. Cộng các phiếu tổng kết thuộc cùng lô; lô chưa có tổng kết vẫn được tính vào kế hoạch.
      </p>
    </section>
  );
}
