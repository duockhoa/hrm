"use client";

import { Fragment, useMemo, useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { ChevronRight, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInfiniteRecordList } from "@/hooks/use-infinite-record-list";
import axiosClient from "@/lib/axios-client";
import { getSearchScopePath } from "@/lib/search-utils";
import useSearchStore from "@/store/search.store";

const endpoint = "/warehouse-stocktakes";
const statusLabels = {
  DRAFT: "Nháp",
  IN_PROGRESS: "Đang kiểm kê",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

type Stocktake = {
  id: number;
  code: string;
  stocktake_date: string;
  status: keyof typeof statusLabels;
  note: string | null;
  createdBy: { name: string | null; username: string };
};

function formatDate(value: string) {
  return value.slice(0, 10).split("-").reverse().join("/");
}

const warehouseDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default function StocktakesPage() {
  const scope = getSearchScopePath(usePathname());
  const search = useSearchStore((state) => state.searchByPath[scope] ?? "");
  const serverSearch = useDebouncedValue(search.trim());
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [selected, setSelected] = useState<Stocktake | null>(null);
  const submitting = useRef(false);
  const {
    records,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
    mutate,
  } = useInfiniteRecordList<Stocktake>({
    url: endpoint,
    filters: { search: serverSearch || undefined },
    storageKey: "warehouseStocktakeListScroll",
  });
  const groups = useMemo(() => {
    const dates = new Map<string, Stocktake[]>();
    for (const record of records) {
      const date = record.stocktake_date.slice(0, 10);
      const group = dates.get(date) ?? [];
      group.push(record);
      dates.set(date, group);
    }
    return [...dates];
  }, [records]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await axiosClient.post<Stocktake>(endpoint, {
        stocktake_date: form.get("stocktake_date"),
        note: form.get("note"),
      });
      setCreating(false);
      setSelected(data);
      toast.success("Đã tạo đợt kiểm kê.");
      void mutate().catch(() => {});
    } catch (error) {
      const message = isAxiosError(error)
        ? error.response?.data?.message
        : undefined;
      setFormError(
        typeof message === "string"
          ? message
          : "Không thể tạo đợt kiểm kê. Vui lòng kiểm tra thông tin và thử lại.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 bg-white p-2">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
          <h1 className="flex items-center gap-2 text-base font-medium">
            <ChevronRight aria-hidden="true" className="size-4" /> Kiểm kê
          </h1>
          <Button
            size="sm"
            onClick={() => {
              setFormError("");
              setCreating(true);
            }}
          >
            <Plus className="size-4" /> Thêm
          </Button>
        </div>
      </div>

      <div aria-busy={isLoading} className="flex flex-col gap-2 px-2 pb-2">
        {isLoading
          ? Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))
          : groups.length
            ? groups.map(([date, group]) => (
                <Fragment key={date}>
                  <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                    {formatDate(date)}
                  </div>
                  {group.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelected(record)}
                      className="flex w-full items-center justify-between gap-3 rounded-md border bg-white px-3 py-2 text-left hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="break-all font-semibold text-blue-700">
                          {record.code}
                        </p>
                        <p className="truncate text-sm text-gray-600">
                          {record.createdBy.name || record.createdBy.username}
                          {record.note ? ` · ${record.note}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {statusLabels[record.status]}
                        </span>
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 text-gray-500"
                        />
                      </div>
                    </button>
                  ))}
                </Fragment>
              ))
            : !error && (
                <p className="p-4 text-center text-sm text-gray-500">
                  {serverSearch
                    ? "Không tìm thấy đợt kiểm kê phù hợp."
                    : "Chưa có đợt kiểm kê."}
                </p>
              )}
      </div>
      <InfiniteRecordLoadStatus
        sentinelRef={sentinelRef}
        count={records.length}
        error={error}
        loading={isLoadingMore}
        hasMore={hasMore}
        onRetry={retry}
        onLoadMore={loadMore}
      />

      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!submitting.current) setCreating(open);
        }}
      >
        <DialogContent showCloseButton={!saving}>
          <DialogHeader>
            <DialogTitle>Thêm đợt kiểm kê</DialogTitle>
            <DialogDescription>
              Đợt kiểm kê áp dụng cho toàn bộ kho.
            </DialogDescription>
          </DialogHeader>
          {creating && (
            <form onSubmit={create} className="space-y-4">
              <fieldset disabled={saving} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stocktake-date">Ngày kiểm kê *</Label>
                  <Input
                    id="stocktake-date"
                    name="stocktake_date"
                    type="date"
                    required
                    min="1000-01-01"
                    max="9999-12-31"
                    defaultValue={warehouseDate.format()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stocktake-note">Ghi chú</Label>
                  <Textarea
                    id="stocktake-note"
                    name="note"
                    maxLength={2000}
                    rows={3}
                  />
                </div>
              </fieldset>
              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setCreating(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <DialogContent className="max-h-[90dvh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Đợt kiểm kê {selected.code}</DialogTitle>
              <DialogDescription>Kiểm kê toàn bộ kho</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm [&_dt]:font-semibold">
              <dt>Ngày kiểm kê</dt>
              <dd>{formatDate(selected.stocktake_date)}</dd>
              <dt>Trạng thái</dt>
              <dd>{statusLabels[selected.status]}</dd>
              <dt>Người tạo</dt>
              <dd>{selected.createdBy.name || selected.createdBy.username}</dd>
              {selected.note && (
                <>
                  <dt>Ghi chú</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {selected.note}
                  </dd>
                </>
              )}
            </dl>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
