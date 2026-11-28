"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { API_ROUTES } from "@/lib/api-routes";
import service from "@/services/warehouse-verification-records.service";
import useSearchStore from "@/store/search.store";
import VerificationPagination from "./verification-pagination";
import VerificationRecordForm from "./verification-record-form";
import {
  formatVerificationDate,
  recordSubjectLabel,
  verificationError,
} from "./verification-record-format";

const route = "/verification-records";

export default function VerificationRecords() {
  const [creating, setCreating] = useState(false);
  const search = useSearchStore((state) => state.searchByPath[route] ?? "");
  const query = useDebouncedValue(search.trim().slice(0, 200));
  const [cursor, setCursor] = useState({ query: "", page: 1 });
  const page = cursor.query === query ? cursor.page : 1;
  const { data, error, isLoading, mutate } = useSWR(
    [API_ROUTES.warehouseVerificationRecords.base, query, page] as const,
    ([, text, pageNumber]) => service.list(text, pageNumber),
    { shouldRetryOnError: false },
  );
  const setSearch = useSearchStore((state) => state.setSearch);

  function handleSaved() {
    setCreating(false);
    setSearch(route, "");
    setCursor({ query: "", page: 1 });
    void mutate();
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg bg-white shadow-md">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <h1 className="text-base font-semibold">Biên bản xác minh</h1>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              Tạo biên bản
            </Button>
          </DialogTrigger>
          {creating && (
            <VerificationRecordForm
              onCancel={() => setCreating(false)}
              onSaved={handleSaved}
            />
          )}
        </Dialog>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <p role="alert">
              {verificationError(error, "Không thể tải danh sách biên bản.")}
            </p>
            <Button variant="outline" size="sm" onClick={() => void mutate()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Mã biên bản</TableHead>
                <TableHead>Đối tượng xác minh</TableHead>
                <TableHead>Địa điểm lập</TableHead>
                <TableHead>Người lập</TableHead>
                <TableHead>Thời điểm tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <Link
                      href={`${route}/${record.id}`}
                      className="font-medium text-blue-700 hover:underline focus-visible:underline"
                    >
                      {record.record_code}
                    </Link>
                  </TableCell>
                  <TableCell>{recordSubjectLabel(record)}</TableCell>
                  <TableCell>{record.location}</TableCell>
                  <TableCell>
                    {record.createdBy.name || record.createdBy.username}
                  </TableCell>
                  <TableCell>
                    {formatVerificationDate(record.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.data.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-gray-500"
                  >
                    {isLoading
                      ? "Đang tải biên bản…"
                      : query
                        ? "Không tìm thấy biên bản phù hợp."
                        : "Chưa có biên bản xác minh."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      {data && !error && (
        <footer className="border-t p-3">
          <VerificationPagination
            page={page}
            total={data.total}
            limit={data.limit}
            onPageChange={(next) => setCursor({ query, page: next })}
          />
          <p className="text-sm text-gray-600">{data.total} biên bản</p>
        </footer>
      )}
    </section>
  );
}
