"use client";

import useSWR from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import filterCatalogsService from "@/services/filter-catalogs.service";
import { memo } from "react";
import type { FilterCatalog, FilterCatalogFiltrationCheck } from "../types";

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const userLabel = (user?: { name?: string | null; username?: string | null } | null) =>
  user?.name ?? user?.username ?? "";

const productName = (usage: FilterCatalogFiltrationCheck) =>
  usage.productionOrder?.item?.item_name ??
  usage.productionOrder?.item_name ??
  usage.productionOrder?.description ??
  usage.productionOrder?.item_code ??
  "";

const FilterUsageHistoryRow = memo(function FilterUsageHistoryRow({
  usage,
}: {
  usage: FilterCatalogFiltrationCheck;
}) {
  return (
    <TableRow>
      <TableCell className="min-w-40">
        {formatDateTime(usage.created_at)}
      </TableCell>
      <TableCell className="min-w-32 font-medium">{productName(usage)}</TableCell>
      <TableCell className="min-w-28">{usage.productionOrder?.lot_no ?? ""}</TableCell>
      <TableCell className="min-w-32">{userLabel(usage.sterilizedBy)}</TableCell>
      <TableCell className="min-w-36">
        {usage.pre_sterilization_integrity_result ?? ""}
      </TableCell>
      <TableCell className="min-w-36">
        {usage.post_filter_integrity_result ?? ""}
      </TableCell>
    </TableRow>
  );
});

export default function FilterCatalogDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<FilterCatalog>(
    API_ROUTES.filterCatalogs.detail(id),
    () => filterCatalogsService.fetchFilterCatalogById(id),
  );

  if (error) {
    return (
      <div className="w-full max-w-5xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Chi tiết cột lọc" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy danh mục cột lọc.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-5xl space-y-3 rounded border bg-white p-4 shadow-md">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const fields = [
    ["Mã cột lọc", data.filter_code],
    ["Loại lọc", data.filter_type],
    ["Số lần hấp cho phép", data.usable_steam_cycles],
    ["Yêu cầu cảm quan trước lọc", data.pre_filter_sensory_requirement],
    ["Yêu cầu cảm quan sau lọc", data.post_filter_sensory_requirement],
    ["Yêu cầu toàn vẹn", data.integrity_requirement],
    ["Mô tả", data.description],
  ].flatMap(([label, value]) =>
    value === null || value === undefined || value === ""
      ? []
      : [{ label: String(label), value: String(value) }],
  );
  const usages = data.productionOrderFiltrationChecks ?? [];

  return (
    <div className="w-full max-w-5xl rounded border bg-white p-4 shadow-md">
      <DetailPanelHeader
        title={`Cột lọc ${data.filter_code}`}
        subtitle={data.filter_type}
        onClose={onClose}
      />
      <div className="mt-4 flex flex-col gap-4">
        {fields.map((field) => (
          <FieldDisplay key={field.label} lable={field.label} value={field.value} />
        ))}
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Lịch sử sử dụng</h2>
          <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
            {usages.length}
          </span>
        </div>
        {usages.length === 0 ? (
          <div className="mt-3 rounded border border-dashed p-5 text-center text-sm text-gray-500">
            Màng lọc chưa từng được sử dụng.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Thời điểm</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Số lô</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Toàn vẹn trước lọc</TableHead>
                  <TableHead>Toàn vẹn sau lọc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usages.map((usage) => (
                  <FilterUsageHistoryRow key={usage.id} usage={usage} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
