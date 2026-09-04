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
import {
  userLoginSessionsService,
} from "@/services/index.service";
import type { UserLoginSession } from "@/services/user-login-sessions.service";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

const PAGE_SIZE = 20;

type LoginHistoryFilters = {
  keyword: string;
  status: "all" | "active" | "logged_out";
  loginFrom: string;
  loginTo: string;
};

const defaultFilters: LoginHistoryFilters = {
  keyword: "",
  status: "all",
  loginFrom: "",
  loginTo: "",
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
};

function SessionStatus({ session }: { session: UserLoginSession }) {
  return session.logout_at ? (
    <Badge variant="secondary">Đã đăng xuất</Badge>
  ) : (
    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
      Đang đăng nhập
    </Badge>
  );
}

export default function LoginHistoryPage() {
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] =
    useState<LoginHistoryFilters>(defaultFilters);
  const [filters, setFilters] = useState<LoginHistoryFilters>(defaultFilters);
  const { data, error, isLoading } = useSWR(
    [
      API_ROUTES.userLoginSessions.base,
      page,
      PAGE_SIZE,
      filters.keyword,
      filters.status,
      filters.loginFrom,
      filters.loginTo,
    ],
    ([, currentPage, limit, keyword, status, loginFrom, loginTo]) =>
      userLoginSessionsService.getUserLoginSessions({
        page: currentPage,
        limit,
        keyword,
        status: status === "all" ? undefined : status,
        loginFrom,
        loginTo,
      }),
  );
  const sessions = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white shadow-md">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">
          Lịch sử đăng nhập
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi các phiên đăng nhập và đăng xuất của người dùng.
        </p>
      </div>

      <form
        className="grid shrink-0 gap-3 border-b border-gray-200 p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_160px_160px_auto]"
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
            placeholder="Tên, tài khoản hoặc email"
            className="pl-9"
            aria-label="Tìm người dùng"
          />
        </div>
        <Select
          value={draftFilters.status}
          onValueChange={(status: LoginHistoryFilters["status"]) =>
            setDraftFilters((current) => ({ ...current, status }))
          }
        >
          <SelectTrigger className="w-full" aria-label="Trạng thái phiên">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang đăng nhập</SelectItem>
            <SelectItem value="logged_out">Đã đăng xuất</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={draftFilters.loginFrom}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              loginFrom: event.target.value,
            }))
          }
          aria-label="Từ ngày đăng nhập"
        />
        <Input
          type="date"
          value={draftFilters.loginTo}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              loginTo: event.target.value,
            }))
          }
          aria-label="Đến ngày đăng nhập"
        />
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
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Người dùng</TableHead>
              <TableHead>Đăng nhập</TableHead>
              <TableHead>Đăng xuất</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Địa chỉ IP</TableHead>
              <TableHead>Thiết bị</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-gray-500">
                  Đang tải lịch sử đăng nhập...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-red-600">
                  Không thể tải lịch sử đăng nhập. Vui lòng thử lại.
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-gray-500">
                  Chưa có dữ liệu đăng nhập.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="text-gray-500">{session.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      {session.user.name || session.user.username}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session.user.email || session.user.username}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(session.login_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(session.logout_at)}
                  </TableCell>
                  <TableCell>
                    <SessionStatus session={session} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {session.ip_address || "-"}
                  </TableCell>
                  <TableCell
                    className="max-w-80 truncate text-xs text-gray-600"
                    title={session.user_agent || undefined}
                  >
                    {session.user_agent || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.total_pages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-3">
          <span className="text-sm text-gray-500">
            {meta.total} phiên đăng nhập
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((currentPage) => currentPage - 1)}
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
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={page >= meta.total_pages}
            >
              Sau
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
