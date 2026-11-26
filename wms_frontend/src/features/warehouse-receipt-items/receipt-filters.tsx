"use client";

import { useState } from "react";
import { ChevronRight, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { RECEIPT_COUNTING_METHODS } from "@/services/warehouse-receipt-items.service";

export type ReceiptFilters = Record<string, string>;
export type FilterGroup = {
  min?: string;
  max?: string;
  step?: string;
  label: string;
  keys: string[];
  type: "text" | "date" | "number" | "select";
  options?: [string, string][];
  placeholder?: string;
};
const imageOptions: [string, string][] = [
  ["has", "Đã có"],
  ["missing", "Chưa có"],
];
const groups: FilterGroup[] = [
  {
    label: "Mã hàng",
    keys: ["item_code"],
    type: "text",
    placeholder: "Nhập chính xác mã hàng",
  },
  { label: "Tên hàng", keys: ["item_name"], type: "text" },
  { label: "Số lô NSX", keys: ["manufacturer_lot_number"], type: "text" },
  { label: "Số lô", keys: ["lot_number"], type: "text" },
  { label: "Ngày nhập", keys: ["from_date", "to_date"], type: "date" },
  { label: "Hạn dùng", keys: ["expiry_from", "expiry_to"], type: "date" },
  {
    label: "Nhà cung cấp",
    keys: ["supplier"],
    type: "text",
    placeholder: "Nhập tên hoặc mã nhà cung cấp",
  },
  {
    label: "Nhà sản xuất",
    keys: ["manufacturer"],
    type: "text",
    placeholder: "Nhập tên hoặc mã nhà sản xuất",
  },
  {
    label: "SL Chứng từ",
    keys: ["quantity_min", "quantity_max"],
    type: "number",
  },
  {
    label: "SL Thực tế",
    keys: ["actual_quantity_min", "actual_quantity_max"],
    type: "number",
  },
  { label: "Đơn vị tính", keys: ["unit"], type: "text" },
  {
    label: "PP Kiểm đếm",
    keys: ["counting_method"],
    type: "select",
    options: Object.entries(RECEIPT_COUNTING_METHODS),
  },
  {
    label: "Cảm quan",
    keys: ["sensory_status"],
    type: "select",
    options: [
      ["pass", "Đạt"],
      ["fail", "Không đạt"],
      ["unrecorded", "Chưa ghi nhận"],
    ],
  },
  {
    label: "Ảnh PXK",
    keys: ["dispatch_note_status"],
    type: "select",
    options: imageOptions,
  },
  {
    label: "Ảnh COA",
    keys: ["coa_status"],
    type: "select",
    options: imageOptions,
  },
  {
    label: "Ảnh hóa đơn",
    keys: ["invoice_status"],
    type: "select",
    options: imageOptions,
  },
  {
    label: "Ảnh nhãn gốc",
    keys: ["original_label_status"],
    type: "select",
    options: imageOptions,
  },
  {
    label: "Gửi PYCLM",
    keys: ["sampling_status"],
    type: "select",
    options: [
      ["sent", "Đã gửi"],
      ["not_sent", "Chưa gửi"],
    ],
  },
  {
    label: "Nhập SAP",
    keys: ["sap_status"],
    type: "select",
    options: [
      ["entered", "Đã nhập"],
      ["not_entered", "Chưa nhập"],
    ],
  },
  {
    label: "Người nhập",
    keys: ["entered_by"],
    type: "text",
    placeholder: "Nhập tên hoặc tài khoản",
  },
];

export function ReceiptFilterButton({
  groups: filterGroups = groups,
  title = "Lọc kiểm hàng nhập kho",
  filters,
  onApply,
  disabled,
}: {
  groups?: FilterGroup[];
  title?: string;
  filters: ReceiptFilters;
  onApply: (filters: ReceiptFilters) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ReceiptFilters>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const count = filterGroups.filter((group) =>
    group.keys.some((key) => filters[key]),
  ).length;

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const group of filterGroups) {
      if (group.type !== "number" && group.type !== "date") continue;
      const [from, to] = group.keys.map((key) => draft[key] ?? "");
      const invalidInput = group.keys
        .map(
          (key) =>
            event.currentTarget.elements.namedItem(key) as HTMLInputElement,
        )
        .find(
          (input) =>
            !input.checkValidity() ||
            (group.type === "number" &&
              input.value !== "" &&
              !/^-?\d{1,9}(?:\.\d{1,3})?$/.test(input.value)),
        );
      const reversed =
        from &&
        to &&
        (group.type === "number" ? Number(from) > Number(to) : from > to);
      if (invalidInput || reversed) {
        setExpanded(group.label);
        setError(
          `${group.label}: vui lòng nhập khoảng hợp lệ, giá trị từ không vượt quá giá trị đến.`,
        );
        if (invalidInput)
          requestAnimationFrame(() => invalidInput.reportValidity());
        return;
      }
    }
    onApply(
      Object.fromEntries(
        Object.entries(draft)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value),
      ),
    );
    setOpen(false);
  }

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={count ? `Lọc dữ liệu (${count} điều kiện)` : "Lọc dữ liệu"}
        title="Lọc dữ liệu"
        disabled={disabled}
        className={`relative ${count ? "bg-blue-50 text-blue-700" : ""}`}
        onClick={() => {
          setDraft({ ...filters });
          setError("");
          setOpen(true);
        }}
      >
        <Filter className="size-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="inset-y-0 left-auto right-0 flex h-dvh w-full max-w-[360px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 p-0 sm:max-w-[360px]"
        >
          <div className="flex items-center justify-between border-b px-4 py-4">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Đóng bộ lọc"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Chọn một hoặc nhiều điều kiện rồi nhấn Áp dụng. Khoảng ngày tính
            theo giờ Việt Nam.
          </DialogDescription>
          <form
            onSubmit={apply}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filterGroups.map((group) => {
                const values = group.keys.map((key) => draft[key] ?? "");
                const summary = group.options
                  ? group.options.find(([value]) => value === values[0])?.[1]
                  : group.keys.length === 2
                    ? values.some(Boolean)
                      ? `${values[0] || "…"} → ${values[1] || "…"}`
                      : ""
                    : values[0];
                return (
                  <details
                    key={group.label}
                    open={expanded === group.label}
                    className="group border-b border-gray-100"
                  >
                    <summary
                      className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-gray-50 [&::-webkit-details-marker]:hidden"
                      onClick={(event) => {
                        event.preventDefault();
                        setExpanded(
                          expanded === group.label ? null : group.label,
                        );
                      }}
                    >
                      <span className="min-w-0">
                        <span
                          className={summary ? "font-medium text-blue-700" : ""}
                        >
                          {group.label}
                        </span>
                        {summary && (
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {summary}
                          </span>
                        )}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="space-y-3 bg-gray-50 px-4 pb-4 pt-1">
                      {group.keys.map((key, index) => (
                        <div key={key} className="space-y-1.5">
                          <Label htmlFor={`filter-${key}`} className="text-xs">
                            {group.keys.length === 2
                              ? index === 0
                                ? "Từ"
                                : "Đến"
                              : group.label}
                          </Label>
                          {group.type === "select" ? (
                            <select
                              id={`filter-${key}`}
                              name={key}
                              value={draft[key] ?? ""}
                              onChange={(event) => {
                                setDraft((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }));
                                setError("");
                              }}
                              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">Tất cả</option>
                              {group.options?.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={`filter-${key}`}
                              name={key}
                              type={group.type}
                              value={draft[key] ?? ""}
                              onChange={(event) => {
                                setDraft((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }));
                                setError("");
                              }}
                              placeholder={
                                group.placeholder ??
                                `Nhập ${group.label.toLowerCase()}`
                              }
                              maxLength={
                                key === "lot_number" ||
                                key === "manufacturer_lot_number"
                                  ? 100
                                  : key === "supplier" || key === "manufacturer"
                                    ? 255
                                    : 191
                              }
                              {...(group.type === "number"
                                ? {
                                    min: group.min ?? "0",
                                    max: group.max ?? "999999999.999",
                                    step: group.step ?? "0.001",
                                  }
                                : group.type === "date"
                                  ? { min: "1000-01-01", max: "9999-12-31" }
                                  : {})}
                              className="bg-white"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
            {error && (
              <p
                role="alert"
                className="border-t px-4 py-2 text-sm text-red-600"
              >
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft({});
                  onApply({});
                  setError("");
                  setOpen(false);
                }}
              >
                Xóa bộ lọc
              </Button>
              <Button type="submit">Áp dụng</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
