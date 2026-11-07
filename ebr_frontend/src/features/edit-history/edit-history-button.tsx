"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { History, Loader2, RefreshCw, X } from "lucide-react";
import useSWRInfinite from "swr/infinite";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import axiosClient from "@/lib/axios-client";
import useUserStore from "@/store/user.store";
import {
  formatHistoryDate,
  formatHistoryValue,
  getHistoryChanges,
} from "./history-utils";
import type {
  EditHistoryEntry,
  EditHistoryFields,
  EditHistoryPage,
} from "./types";

const actionLabels = {
  CREATE: "Đã tạo phiếu",
  UPDATE: "Đã chỉnh sửa",
  DELETE: "Đã xóa phiếu",
};

function HistoryValue({ children }: { children: string }) {
  if (children.length > 180) {
    return (
      <details>
        <summary className="cursor-pointer text-blue-600">Xem nội dung</summary>
        <p className="mt-2 whitespace-pre-wrap break-words">{children}</p>
      </details>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{children}</span>;
}

function HistoryEntry({
  entry,
  fields,
}: {
  entry: EditHistoryEntry;
  fields: EditHistoryFields;
}) {
  const changes = getHistoryChanges(entry, fields);
  return (
    <li className="relative rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold text-gray-900">
            {entry.actor_name ||
              (entry.actor_id
                ? `Người dùng #${entry.actor_id}`
                : "Không ghi nhận người thực hiện")}
          </p>
          <time dateTime={entry.created_at} className="text-xs text-gray-500">
            {formatHistoryDate(entry.created_at)}
          </time>
        </div>
        <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
          {actionLabels[entry.action] ?? "Thay đổi dữ liệu"}
        </span>
      </div>

      {changes.length > 0 ? (
        <table className="mt-3 w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">
            Giá trị trước và sau khi thay đổi
          </caption>
          <thead>
            <tr className="border-y bg-gray-50 text-xs text-gray-600">
              <th scope="col" className="w-[32%] px-2 py-2 font-medium">
                Trường
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Trước
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Sau
              </th>
            </tr>
          </thead>
          <tbody>
            {changes.map(
              ({ key, field, before, after, hasBefore, hasAfter }) => (
                <tr key={key} className="border-b align-top">
                  <th
                    scope="row"
                    className="break-words px-2 py-2 font-medium text-gray-700"
                  >
                    {field.label}
                  </th>
                  <td className="px-2 py-2 text-gray-500">
                    <HistoryValue>
                      {hasBefore
                        ? formatHistoryValue(before, field)
                        : "Không ghi nhận"}
                    </HistoryValue>
                  </td>
                  <td className="px-2 py-2 font-medium text-blue-800">
                    <HistoryValue>
                      {hasAfter
                        ? formatHistoryValue(after, field)
                        : "Không ghi nhận"}
                    </HistoryValue>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          Không có chi tiết trường thay đổi để hiển thị.
        </p>
      )}

      {entry.action === "UPDATE" || entry.reason ? (
        <div className="mt-3 text-sm">
          <p className="mb-1 font-medium text-gray-700">Lý do chỉnh sửa</p>
          <div className="text-gray-600">
            <HistoryValue>
              {entry.reason || "Không ghi nhận lý do"}
            </HistoryValue>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function HistoryList({
  historyUrl,
  fields,
}: {
  historyUrl: string;
  fields: EditHistoryFields;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<EditHistoryPage>(
      (index, previous: EditHistoryPage | null) => {
        if (previous && previous.meta.page >= previous.meta.total_pages)
          return null;
        return [historyUrl, userId, index + 1] as const;
      },
      async ([url, , page]: readonly [string, unknown, number]) => {
        const response = await axiosClient.get<EditHistoryPage>(url, {
          params: { page, limit: 20 },
        });
        return response.data;
      },
      {
        revalidateOnMount: true,
        revalidateAll: true,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        dedupingInterval: 0,
      },
    );
  const entries = Array.from(
    new Map(
      data?.flatMap((page) => page.data).map((entry) => [entry.id, entry]),
    ).values(),
  );
  const lastPage = data?.[data.length - 1];
  const hasMore = lastPage && lastPage.meta.page < lastPage.meta.total_pages;
  const accessDenied =
    isAxiosError(error) &&
    [401, 403, 404].includes(error.response?.status ?? 0);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-4"
      aria-busy={isLoading}
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>
            {accessDenied
              ? "Phiếu không còn tồn tại hoặc bạn không có quyền xem lịch sử."
              : "Không thể tải lịch sử chỉnh sửa."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={isValidating}
            onClick={() => void mutate()}
          >
            <RefreshCw className="size-4" /> Thử lại
          </Button>
        </div>
      ) : null}

      {isLoading && !data ? (
        <div
          className="space-y-4"
          role="status"
          aria-label="Đang tải lịch sử chỉnh sửa"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : !error && entries.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-500">
          Chưa có lịch sử chỉnh sửa được ghi nhận cho phiếu này.
        </div>
      ) : null}

      {!accessDenied && entries.length > 0 ? (
        <ol className="space-y-4">
          {entries.map((entry) => (
            <HistoryEntry key={entry.id} entry={entry} fields={fields} />
          ))}
        </ol>
      ) : null}

      {hasMore && !error ? (
        <Button
          className="mt-4 w-full"
          variant="outline"
          type="button"
          disabled={isValidating}
          onClick={() => void setSize(size + 1)}
        >
          {isValidating ? <Loader2 className="size-4 animate-spin" /> : null}
          {isValidating ? "Đang tải..." : "Xem lịch sử cũ hơn"}
        </Button>
      ) : null}
    </div>
  );
}

export default function EditHistoryButton({
  historyUrl,
  title,
  fields,
}: {
  historyUrl: string;
  title: string;
  fields: EditHistoryFields;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          title="Lịch sử chỉnh sửa"
          aria-label="Lịch sử chỉnh sửa"
        >
          <History className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-0 right-0 left-auto flex h-dvh w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 p-0 text-left data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[640px]"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b p-4 text-left">
          <div className="min-w-0 space-y-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="size-4 shrink-0" /> Lịch sử chỉnh sửa
            </DialogTitle>
            <DialogDescription className="break-words">
              {title}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Đóng lịch sử chỉnh sửa"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        {open ? (
          <HistoryList
            key={historyUrl}
            historyUrl={historyUrl}
            fields={fields}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
