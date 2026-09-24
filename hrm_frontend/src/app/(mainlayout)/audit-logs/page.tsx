"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import { auditLogsService } from "@/services/index.service";
import type { AuditLog } from "@/services/audit-logs.service";
import axios from "axios";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

const PAGE_SIZE = 20;

type Filters = {
  keyword: string;
  entityType: string;
  action: "all" | AuditLog["action"];
};

const defaultFilters: Filters = {
  keyword: "",
  entityType: "",
  action: "all",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function JsonValue({ value }: { value: AuditLog["old_values"] }) {
  if (value === null) return <span className="text-gray-400">—</span>;

  return (
    <pre className="max-h-40 min-w-48 max-w-80 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2 font-mono text-xs text-slate-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ActionBadge({ action }: { action: AuditLog["action"] }) {
  const label =
    {
      CREATE: "Tạo",
      UPDATE: "Cập nhật",
      DELETE: "Xóa",
    }[action] ?? action;

  return <Badge variant="secondary">{label}</Badge>;
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const { data, error, isLoading } = useSWR(
    [
      API_ROUTES.auditLogs.base,
      page,
      PAGE_SIZE,
      filters.keyword,
      filters.entityType,
      filters.action,
    ],
    ([, currentPage, limit, keyword, entityType, action]) =>
      auditLogsService.getAuditLogs({
        page: currentPage,
        limit,
        keyword,
        entityType,
        action: action === "all" ? undefined : action,
      }),
  );
  const logs = data?.data ?? [];
  const meta = data?.meta;
  const forbidden = axios.isAxiosError(error) && error.response?.status === 403;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white shadow-md">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">
          Lịch sử thay đổi
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi dữ liệu được tạo, cập nhật hoặc xóa trong hệ thống.
        </p>
      </div>

      <form
        className="grid shrink-0 gap-3 border-b border-gray-200 p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_180px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setFilters(draftFilters);
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={draftFilters.keyword}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
            placeholder="Đối tượng, người thao tác hoặc lý do"
            className="pl-9"
            aria-label="Tìm lịch sử thay đổi"
          />
        </div>
        <Input
          value={draftFilters.entityType}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              entityType: event.target.value,
            }))
          }
          placeholder="Tên bảng, ví dụ users"
          aria-label="Lọc theo tên bảng"
        />
        <Select
          value={draftFilters.action}
          onValueChange={(action: Filters["action"]) =>
            setDraftFilters((current) => ({ ...current, action }))
          }
        >
          <SelectTrigger className="w-full" aria-label="Lọc theo thao tác">
            <SelectValue placeholder="Thao tác" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả thao tác</SelectItem>
            <SelectItem value="CREATE">Tạo</SelectItem>
            <SelectItem value="UPDATE">Cập nhật</SelectItem>
            <SelectItem value="DELETE">Xóa</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button type="submit">
            <Search />
            Lọc
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Xóa bộ lọc"
            aria-label="Xóa bộ lọc"
            onClick={() => {
              setPage(1);
              setDraftFilters(defaultFilters);
              setFilters(defaultFilters);
            }}
          >
            <RotateCcw />
          </Button>
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="min-w-[1600px]">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Người thao tác</TableHead>
              <TableHead>Bảng</TableHead>
              <TableHead>Đối tượng</TableHead>
              <TableHead>Thao tác</TableHead>
              <TableHead>Giá trị cũ</TableHead>
              <TableHead>Giá trị mới</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Request ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10}>Đang tải lịch sử thay đổi...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={10} className="text-red-600">
                  {forbidden
                    ? "Bạn không có quyền xem lịch sử thay đổi."
                    : "Không thể tải lịch sử thay đổi. Vui lòng thử lại."}
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-gray-500">
                  Chưa có lịch sử thay đổi phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-gray-500">
                    {log.id}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <div>{log.actor_name || "Hệ thống"}</div>
                    {log.actor_id && (
                      <div className="font-mono text-xs text-gray-500">
                        ID: {log.actor_id}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.entity_type}
                  </TableCell>
                  <TableCell>
                    <div>{log.entity_name || "—"}</div>
                    <div className="font-mono text-xs text-gray-500">
                      ID: {log.entity_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell>
                    <JsonValue value={log.old_values} />
                  </TableCell>
                  <TableCell>
                    <JsonValue value={log.new_values} />
                  </TableCell>
                  <TableCell className="max-w-60 break-words">
                    {log.reason || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">
                    {log.request_id || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
          <span className="text-sm text-gray-500">{meta.total} thay đổi</span>
          {meta.total_pages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current - 1)}
                disabled={page === 1}
              >
                <ChevronLeft />
                Trước
              </Button>
              <span className="text-sm text-gray-600">
                Trang {meta.page}/{meta.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= meta.total_pages}
              >
                Sau
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
