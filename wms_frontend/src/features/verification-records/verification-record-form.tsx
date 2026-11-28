"use client";

import { useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { API_ROUTES } from "@/lib/api-routes";
import service, {
  type VerificationParticipant,
  type VerificationSubject,
  type VerificationSubjectType,
} from "@/services/warehouse-verification-records.service";
import useUserStore from "@/store/user.store";
import VerificationPagination from "./verification-pagination";
import VerificationParticipantPicker from "./verification-participant-picker";
import {
  formatVerificationDate,
  verificationError,
} from "./verification-record-format";

function subjectReference(
  subject: VerificationSubject,
  type: VerificationSubjectType,
) {
  return type === "receipt"
    ? `Dòng nhập #${subject.id}`
    : `Lệnh ${subject.reference || "#" + subject.id}`;
}

export default function VerificationRecordForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const enteredBy = useUserStore(
    (state) => state.user?.name || state.user?.username || "",
  );
  const [location, setLocation] = useState("");
  const [type, setType] = useState<VerificationSubjectType>("receipt");
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim());
  const [cursor, setCursor] = useState({ query: "", page: 1 });
  const page = cursor.query === query ? cursor.page : 1;
  const [selected, setSelected] = useState<VerificationSubject | null>(null);
  const [participants, setParticipants] = useState<VerificationParticipant[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const submitting = useRef(false);

  const { data, error, isLoading, mutate } = useSWR(
    [
      API_ROUTES.warehouseVerificationRecords.subjects,
      type,
      query,
      page,
    ] as const,
    ([, subjectType, text, pageNumber]) =>
      service.subjects(subjectType, text, pageNumber),
    { shouldRetryOnError: false },
  );

  function changeType(value: VerificationSubjectType) {
    setType(value);
    setSelected(null);
    setSearch("");
    setCursor({ query: "", page: 1 });
    setSaveError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!location.trim() || !selected) {
      setSaveError("Nhập địa điểm và chọn đối tượng xác minh.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const record = await service.create({
        location: location.trim(),
        participant_user_ids: participants.map(({ id }) => id),
        ...(type === "receipt"
          ? { warehouse_receipt_item_id: selected.id }
          : { production_order_id: selected.id }),
      });
      toast.success(`Đã tạo biên bản ${record.record_code}.`);
      onSaved();
    } catch (error) {
      setSaveError(
        verificationError(error, "Không thể lưu biên bản. Vui lòng thử lại."),
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <DialogContent
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
      showCloseButton={!saving}
      onEscapeKeyDown={(event) => {
        if (submitting.current) event.preventDefault();
      }}
      onInteractOutside={(event) => {
        if (submitting.current) event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>Tạo biên bản xác minh</DialogTitle>
        <DialogDescription>
          Chọn một dòng hàng nhập kho hoặc một lệnh sản xuất.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-location">Địa điểm lập</Label>
            <Input
              id="verification-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verification-subject-type">
              Đối tượng xác minh
            </Label>
            <select
              id="verification-subject-type"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(event) =>
                changeType(
                  event.target.value === "receipt"
                    ? "receipt"
                    : "production_order",
                )
              }
            >
              <option value="receipt">Hàng nhập kho</option>
              <option value="production_order">Lệnh sản xuất</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verification-subject-search">Tìm đối tượng</Label>
            <Input
              id="verification-subject-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCursor({ query: "", page: 1 });
              }}
              maxLength={200}
              placeholder={
                type === "receipt"
                  ? "Mã hàng, tên hàng hoặc số lô"
                  : "Mã lệnh, mã hàng, tên hàng hoặc số lô"
              }
            />
            {selected && (
              <p
                className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800"
                role="status"
              >
                Đã chọn {subjectReference(selected, type)} ·{" "}
                {selected.item_code} · Lô {selected.lot_number || "—"}
              </p>
            )}
            {error ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <p role="alert">
                  {verificationError(
                    error,
                    "Không thể tải đối tượng xác minh.",
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
                Đang tải đối tượng…
              </p>
            ) : data?.data.length ? (
              <ul className="max-h-56 divide-y overflow-auto rounded-md border">
                {data.data.map((subject) => (
                  <li key={subject.id}>
                    <button
                      type="button"
                      aria-pressed={selected?.id === subject.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-blue-600 aria-pressed:bg-blue-50"
                      onClick={() => {
                        setSelected(subject);
                        setSaveError("");
                      }}
                    >
                      <span className="block break-words font-medium">
                        {subject.item_code} · {subject.item_name}
                      </span>
                      <span className="block text-gray-600">
                        {subjectReference(subject, type)} · Lô{" "}
                        {subject.lot_number || "—"} ·{" "}
                        {formatVerificationDate(subject.date)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                Không tìm thấy đối tượng phù hợp.
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
          <VerificationParticipantPicker
            value={participants}
            onChange={setParticipants}
          />
          <div className="space-y-2">
            <Label htmlFor="verification-entered-by">Người nhập</Label>
            <Input id="verification-entered-by" value={enteredBy} readOnly />
          </div>
        </fieldset>
        {saveError && (
          <p role="alert" className="text-sm text-red-700">
            {saveError}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu biên bản"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
