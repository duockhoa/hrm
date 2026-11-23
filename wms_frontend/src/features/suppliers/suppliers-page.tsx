"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
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
import businessPartnersService, {
  SUPPLIERS_URL,
} from "@/services/business-partners.service";

export default function SuppliersPage() {
  const [keyword, setKeyword] = useState("");
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    SUPPLIERS_URL,
    businessPartnersService.listSuppliers,
  );
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isValidating}
            onClick={() => void mutate()}
            title="Tải lại"
            aria-label="Tải lại danh sách nhà cung cấp"
          >
            <RefreshCw
              className={isValidating ? "size-4 animate-spin" : "size-4"}
            />
          </Button>
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
            Không thể tải danh sách nhà cung cấp. Vui lòng nhấn Tải lại.
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
