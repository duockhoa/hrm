"use client";

import { useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { matchesSearchKeyword } from "@/lib/search-utils";
import { API_ROUTES } from "@/lib/api-routes";
import businessPartnersService, {
  SUPPLIERS_URL,
} from "@/services/business-partners.service";
import userService from "@/services/user.service";

export default function SuppliersPage() {
  const [keyword, setKeyword] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: user } = useSWR(API_ROUTES.users.me, userService.fetcherMe);
  const { data: permissions, error: permissionError } = useSWR(
    user?.id ? [API_ROUTES.users.myPermissions, user.id] : null,
    userService.fetchMyPermissions,
  );
  const canSync =
    !permissionError && permissions?.permissionKeys.includes("items.update");
  const { data, error, isLoading, mutate } = useSWR(
    SUPPLIERS_URL,
    businessPartnersService.listSuppliers,
  );

  const syncSuppliers = async () => {
    if (!canSync || isSyncing) return;
    setIsSyncing(true);
    try {
      const { synced, failed } = await businessPartnersService.syncSuppliers();
      if (failed) {
        toast.warning(
          `Đã đồng bộ ${synced} nhà cung cấp. Có ${failed} bản ghi lỗi.`,
        );
      } else {
        toast.success(`Đã đồng bộ ${synced} nhà cung cấp từ SAP.`);
      }
      await mutate().catch(() => {
        toast.error(
          "Đã đồng bộ SAP nhưng chưa tải lại được danh sách nhà cung cấp.",
        );
      });
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(
        message || "Không nhận được kết quả đồng bộ SAP. Vui lòng thử lại.",
      );
    } finally {
      setIsSyncing(false);
    }
  };
  const suppliers = useMemo(
    () =>
      (data ?? []).filter(({ card_code, card_name, tax_code }) =>
        matchesSearchKeyword([card_code, card_name, tax_code], keyword),
      ),
    [data, keyword],
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Nhà cung cấp</h2>
            <p className="mt-1 text-sm text-gray-500">
              Danh sách nhà cung cấp được đồng bộ từ SAP.
            </p>
          </div>
          {canSync && (
            <Button
              type="button"
              variant="outline"
              disabled={isSyncing}
              aria-busy={isSyncing}
              onClick={() => void syncSuppliers()}
            >
              <RefreshCw
                className={isSyncing ? "size-4 animate-spin" : "size-4"}
              />
              {isSyncing ? "Đang đồng bộ…" : "Đồng bộ SAP"}
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="pl-9"
            placeholder="Tìm theo mã, tên hoặc mã số thuế"
            aria-label="Tìm nhà cung cấp"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error && (
          <p
            role="alert"
            className="mb-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            Không thể tải danh sách nhà cung cấp. Vui lòng thử lại.
          </p>
        )}
        <Table aria-label="Danh sách nhà cung cấp">
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Mã nhà cung cấp</TableHead>
              <TableHead>Tên nhà cung cấp</TableHead>
              <TableHead className="w-44">Mã số thuế</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map(({ card_code, card_name, tax_code }) => (
              <TableRow key={card_code}>
                <TableCell className="text-gray-500">{card_code}</TableCell>
                <TableCell className="whitespace-normal font-medium">
                  {card_name}
                </TableCell>
                <TableCell>{tax_code || "—"}</TableCell>
              </TableRow>
            ))}
            {suppliers.length === 0 && !error && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-sm text-gray-500"
                >
                  {isLoading
                    ? "Đang tải nhà cung cấp…"
                    : keyword.trim()
                      ? "Không tìm thấy nhà cung cấp phù hợp."
                      : "Chưa có nhà cung cấp."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
