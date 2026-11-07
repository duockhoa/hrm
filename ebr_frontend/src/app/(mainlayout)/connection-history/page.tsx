"use client";

import { useState } from "react";
import useSWR from "swr";
import { isAxiosError } from "axios";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Unplug,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { userService } from "@/services/index.service";
import {
  CONNECTION_HISTORY_URL,
  fetchConnectionHistory,
  type ConnectionSession,
  type ConnectionStatus,
} from "@/features/connection-history/connection-history.service";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});
const formatDate = (value: string | null) =>
  value ? dateFormatter.format(new Date(value)) : "—";
const statusInfo = {
  connected: {
    label: "Đang kết nối",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  reconnecting: {
    label: "Chờ kết nối lại",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  ended: {
    label: "Đã kết thúc",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};
function duration(session: ConnectionSession) {
  const end =
    session.ended_at ??
    (session.status === "connected"
      ? null
      : (session.disconnected_at ?? session.last_seen_at));
  const seconds = Math.max(
    0,
    Math.floor(
      ((end ? new Date(end).getTime() : Date.now()) -
        new Date(session.connected_at).getTime()) /
        1000,
    ),
  );
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours
    ? `${hours} giờ ${minutes} phút`
    : minutes
      ? `${minutes} phút`
      : `${seconds} giây`;
}
function ConnectionHistoryTableSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <TableRow key={index} aria-hidden="true">
      <TableCell className="pl-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1 h-3 w-24" />
      </TableCell>
      {Array.from({ length: 3 }, (_, cellIndex) => (
        <TableCell key={cellIndex}>
          <Skeleton className="h-3 w-32" />
        </TableCell>
      ))}
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-28 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="mx-auto h-4 w-8" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3 w-44" />
      </TableCell>
    </TableRow>
  ));
}

export default function ConnectionHistoryPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ConnectionStatus>();
  const {
    data: permissions,
    error: permissionsError,
    mutate: retryPermissions,
  } = useSWR(API_ROUTES.users.myPermissions, userService.fetchMyPermissions);
  const canRead = permissions?.permissionKeys.includes("users.list");
  const { data, error, isLoading } = useSWR(
    canRead ? [CONNECTION_HISTORY_URL, page, status] : null,
    () => fetchConnectionHistory(page, status),
    {
      refreshInterval: 15_000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
      keepPreviousData: true,
      onSuccess(result) {
        const lastPage = Math.max(1, result.meta.total_pages);
        if (page > lastPage) setPage(lastPage);
      },
    },
  );
  const showSkeleton = !permissions || isLoading;

  if (permissionsError)
    return (
      <div
        role="alert"
        className="rounded-lg bg-white p-6 text-sm text-red-600"
      >
        Không thể kiểm tra quyền xem lịch sử kết nối.
        <Button
          variant="outline"
          className="ml-3"
          onClick={() => void retryPermissions()}
        >
          Thử lại
        </Button>
      </div>
    );
  if (permissions && !canRead)
    return (
      <div
        role="alert"
        className="rounded-lg bg-white p-6 text-sm text-gray-600"
      >
        Bạn chưa có quyền xem lịch sử kết nối. Vui lòng liên hệ quản trị viên.
      </div>
    );

  return (
    <div className="flex min-h-full flex-col gap-4" aria-busy={showSkeleton}>
      {showSkeleton && (
        <span role="status" className="sr-only">
          Đang tải lịch sử kết nối...
        </span>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            {
              key: "connected",
              title: "Đang kết nối",
              icon: Activity,
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              key: "reconnecting",
              title: "Chờ kết nối lại",
              icon: Clock3,
              color: "text-amber-600 bg-amber-50",
            },
            {
              key: "ended",
              title: "Đã kết thúc",
              icon: Unplug,
              color: "text-slate-600 bg-slate-100",
            },
          ] as const
        ).map(({ key, title, icon: Icon, color }) => (
          <button
            key={key}
            type="button"
            aria-label={title}
            aria-pressed={status === key}
            disabled={!permissions}
            onClick={() => {
              setPage(1);
              setStatus((current) => (current === key ? undefined : key));
            }}
            className={`flex cursor-pointer items-center justify-between rounded-lg border px-5 py-4 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              status === key
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
            }`}
          >
            <div>
              <span className="block text-sm text-gray-500">{title}</span>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {showSkeleton && !data ? (
                  <Skeleton className="h-8 w-16" />
                ) : !error && data
                  ? data.summary[key].toLocaleString("vi-VN")
                  : "—"}
              </div>
            </div>
            <span className={`rounded-lg p-3 ${color}`}>
              <Icon className="size-5" />
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="pl-4">Phiên / Người dùng</TableHead>
                <TableHead>Mở EBR lúc</TableHead>
                <TableHead>Lần cuối kết nối</TableHead>
                <TableHead>Ngắt / Kết thúc lúc</TableHead>
                <TableHead>Thời lượng phiên</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Số lần kết nối</TableHead>
                <TableHead>Địa chỉ IP</TableHead>
                <TableHead>Thiết bị / Trình duyệt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                <ConnectionHistoryTableSkeleton />
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-12 text-center text-red-600"
                    role="alert"
                  >
                    {isAxiosError(error) && error.response?.status === 403
                      ? "Bạn chưa có quyền xem lịch sử kết nối."
                      : "Không thể tải lịch sử kết nối. Vui lòng thử lại sau."}
                  </TableCell>
                </TableRow>
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-12 text-center text-gray-500"
                  >
                    {status
                      ? "Chưa có phiên kết nối thuộc trạng thái này."
                      : "Chưa có lịch sử kết nối."}
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="pl-4">
                      <div className="font-medium text-gray-900">
                        {session.user.name || session.user.username}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        #{session.id} · {session.user.username}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(session.connected_at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(session.last_seen_at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(
                        session.ended_at ?? session.disconnected_at,
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {duration(session)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusInfo[session.status].className}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {statusInfo[session.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {session.connection_count}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {session.ip_address || "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-56 truncate text-xs text-gray-500"
                      title={session.user_agent ?? undefined}
                    >
                      {session.user_agent || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || showSkeleton}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft />
              Trước
            </Button>
            {showSkeleton && !data ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span>
                Trang {page}/{Math.max(1, data?.meta.total_pages ?? 1)}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!data || page >= data.meta.total_pages || showSkeleton}
              onClick={() => setPage((current) => current + 1)}
            >
              Sau
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
