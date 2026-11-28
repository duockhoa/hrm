"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { API_ROUTES } from "@/lib/api-routes";
import service, {
  type VerificationParticipant,
} from "@/services/warehouse-verification-records.service";
import VerificationPagination from "./verification-pagination";
import { verificationError } from "./verification-record-format";

export default function VerificationParticipantPicker({
  value,
  onChange,
}: {
  value: VerificationParticipant[];
  onChange: (value: VerificationParticipant[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim());
  const [cursor, setCursor] = useState({ query: "", page: 1 });
  const page = cursor.query === query ? cursor.page : 1;
  const { data, error, isLoading, mutate } = useSWR(
    open
      ? ([
          API_ROUTES.warehouseVerificationRecords.participantOptions,
          query,
          page,
        ] as const)
      : null,
    ([, text, pageNumber]) => service.participantOptions(text, pageNumber),
    { shouldRetryOnError: false },
  );

  function remove(id: number) {
    onChange(value.filter((participant) => participant.id !== id));
  }

  return (
    <div className="space-y-2">
      <Label id="verification-participant-label">Người tham gia</Label>
      <div className="flex flex-wrap gap-2">
        {value.map((participant) => (
          <span
            key={participant.id}
            title={participant.username}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 py-1 pl-2 pr-1 text-sm text-blue-800"
          >
            <span className="break-words">
              {participant.name || participant.username}
            </span>
            <button
              type="button"
              aria-label={`Bỏ chọn ${participant.name || participant.username} (${participant.username})`}
              className="rounded p-0.5 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-600"
              onClick={() => remove(participant.id)}
            >
              <X className="size-4" />
            </button>
          </span>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        aria-expanded={open}
        aria-controls={open ? "verification-participant-options" : undefined}
        onClick={() => setOpen(!open)}
      >
        {open ? "Đóng danh sách" : "Chọn người tham gia"}
        <ChevronDown className={open ? "rotate-180" : undefined} />
      </Button>
      {open && (
        <div
          id="verification-participant-options"
          role="group"
          aria-labelledby="verification-participant-label"
          className="space-y-2 rounded-md border p-2"
        >
          <Input
            aria-label="Tìm người tham gia"
            placeholder="Họ tên hoặc tên đăng nhập"
            value={search}
            maxLength={200}
            onChange={(event) => {
              setSearch(event.target.value);
              setCursor({ query: "", page: 1 });
            }}
          />
          {error ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <p role="alert">
                {verificationError(
                  error,
                  "Không thể tải danh sách người tham gia.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void mutate()}
              >
                Thử lại
              </Button>
            </div>
          ) : isLoading ? (
            <p role="status" className="text-sm text-gray-500">
              Đang tải danh sách…
            </p>
          ) : data?.data.length ? (
            <ul className="max-h-40 divide-y overflow-auto">
              {data.data.map((participant) => (
                <li key={participant.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0"
                      checked={value.some(({ id }) => id === participant.id)}
                      onChange={(event) => {
                        if (event.target.checked)
                          onChange([...value, participant]);
                        else remove(participant.id);
                      }}
                    />
                    <span className="break-words">
                      {participant.name || participant.username}
                      {participant.name &&
                        participant.name !== participant.username && (
                          <span className="ml-2 text-gray-500">
                            {participant.username}
                          </span>
                        )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              Không tìm thấy người phù hợp.
            </p>
          )}
          {data && !error && (
            <VerificationPagination
              page={page}
              total={data.total}
              limit={data.limit}
              onPageChange={(next) => setCursor({ query, page: next })}
            />
          )}
        </div>
      )}
    </div>
  );
}
