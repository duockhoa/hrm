"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import warehouseReceiptItemsService, {
  type WarehouseReceiptItem,
  type WarehouseReceiptItemPayload,
} from "@/services/warehouse-receipt-items.service";

export function receiptError(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    if (error.response?.status === 403)
      return "Bạn không có quyền thực hiện thao tác này.";
    if (error.response?.status === 404)
      return "Không tìm thấy bản ghi hàng nhập kho.";
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join("; ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

function localDateTime(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const textFields = [
  ["item_code", "Mã hàng", 191, true],
  ["lot_number", "Số lô", 100, true],
  ["manufacturer_lot_number", "Số lô nhà sản xuất", 100, false],
  ["packaging_specification", "Quy cách đóng gói", 255, false],
  ["supplier_name", "Nhà cung cấp", 255, false],
  ["manufacturer_name", "Nhà sản xuất", 255, false],
] as const;

export default function ReceiptForm({
  data,
  onCancel,
  onSaved,
}: {
  data?: WarehouseReceiptItem;
  onCancel: () => void;
  onSaved: (receipt: WarehouseReceiptItem) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receivedAt] = useState(() =>
    localDateTime(data?.received_at ?? new Date().toISOString()),
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    const note = text("note");
    if (new TextEncoder().encode(note).length > 65535) {
      setError("Ghi chú vượt quá giới hạn 65535 byte UTF-8.");
      return;
    }
    const receivedDate = new Date(text("received_at"));
    if (!Number.isFinite(receivedDate.getTime())) {
      setError("Vui lòng nhập thời điểm nhập hợp lệ.");
      return;
    }
    const payload: WarehouseReceiptItemPayload = {
      item_code: text("item_code"),
      lot_number: text("lot_number"),
      manufacturer_lot_number: text("manufacturer_lot_number") || null,
      packaging_specification: text("packaging_specification") || null,
      supplier_name: text("supplier_name") || null,
      manufacturer_name: text("manufacturer_name") || null,
      expiry_date: text("expiry_date") || null,
      note: note || null,
      received_at:
        data && text("received_at") === receivedAt
          ? data.received_at
          : receivedDate.toISOString(),
    };
    if (!payload.item_code || !payload.lot_number) {
      setError("Vui lòng nhập mã hàng và số lô.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      const changes = data
        ? Object.fromEntries(
            Object.entries(payload).filter(
              ([key, value]) =>
                value !==
                (key === "expiry_date"
                  ? (data.expiry_date?.slice(0, 10) ?? null)
                  : data[key as keyof WarehouseReceiptItem]),
            ),
          )
        : payload;
      if (data && Object.keys(changes).length === 0) {
        onCancel();
        return;
      }
      const saved = data
        ? await warehouseReceiptItemsService.update(data.id, changes)
        : await warehouseReceiptItemsService.create(payload);
      toast.success(
        data ? "Đã cập nhật hàng nhập kho." : "Đã thêm hàng nhập kho.",
      );
      onSaved(saved);
    } catch (error) {
      setError(receiptError(error, "Không thể lưu hàng nhập kho."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
        {textFields.map(([key, label, maxLength, required]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`receipt-${key}`}>
              {label}
              {required ? " *" : ""}
            </Label>
            <Input
              id={`receipt-${key}`}
              name={key}
              defaultValue={data?.[key] ?? ""}
              maxLength={maxLength}
              required={required}
            />
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="receipt-expiry">Hạn dùng</Label>
          <Input
            id="receipt-expiry"
            name="expiry_date"
            type="date"
            min="1000-01-01"
            max="9999-12-31"
            defaultValue={data?.expiry_date?.slice(0, 10) ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receipt-received">Thời điểm nhập *</Label>
          <Input
            id="receipt-received"
            name="received_at"
            type="datetime-local"
            step="1"
            required
            defaultValue={receivedAt}
            min="1000-01-01T00:00"
            max="9999-12-31T23:59:59"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="receipt-note">Ghi chú</Label>
          <Textarea
            id="receipt-note"
            name="note"
            rows={4}
            defaultValue={data?.note ?? ""}
          />
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </form>
  );
}
