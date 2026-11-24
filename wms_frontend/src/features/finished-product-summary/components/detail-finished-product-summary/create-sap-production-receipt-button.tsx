"use client";

import { isAxiosError } from "axios";
import { Loader2, PackageCheck } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService, {
  type SapProductionReceiptInput,
} from "@/services/product-orders.service";

type ReceiptDefaults = Omit<
  SapProductionReceiptInput,
  "requestId" | "postingDate" | "quantity"
> & {
  quantity: number | string | null;
};

const postingDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ho_Chi_Minh",
});

const fields = [
  { name: "postingDate", label: "Ngày nhập", type: "date" },
  {
    name: "quantity",
    label: "Số lượng",
    type: "number",
    step: "0.000001",
    min: "0.000001",
  },
  { name: "warehouseCode", label: "Mã kho", type: "text", maxLength: 8 },
  { name: "lotNumber", label: "Số lô", type: "text", maxLength: 36 },
  { name: "manufacturingDate", label: "Ngày sản xuất", type: "date" },
  { name: "expiryDate", label: "Hạn sử dụng", type: "date" },
  {
    name: "departmentCode",
    label: "Phòng ban - Bộ phận",
    type: "text",
    maxLength: 8,
  },
  {
    name: "costItemCode",
    label: "Khoản mục chi phí",
    type: "text",
    maxLength: 8,
  },
] as const;

export default function CreateSapProductionReceiptButton({
  summaryId,
  userId,
  orderLabel,
  defaults,
  onCreated,
  onConflict,
}: {
  summaryId: number | string;
  userId: number | string;
  orderLabel: string;
  defaults: ReceiptDefaults;
  onCreated: (documentNumber: number) => void;
  onConflict: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<SapProductionReceiptInput | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const sendingRef = useRef(false);
  const { mutate } = useSWRConfig();
  const storageKey = `wms:sap-production-receipt:${userId}:${summaryId}`;

  function toggleOpen(nextOpen: boolean) {
    if (sendingRef.current) return;
    if (nextOpen) {
      try {
        setPending(JSON.parse(sessionStorage.getItem(storageKey) ?? "null"));
      } catch {
        // An in-memory pending request can still be checked in this tab.
      }
      setErrorMessage("");
    }
    setOpen(nextOpen);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const payload = pending ?? {
      requestId: crypto.randomUUID(),
      postingDate: text("postingDate"),
      quantity: Number(text("quantity")),
      warehouseCode: text("warehouseCode"),
      lotNumber: text("lotNumber"),
      manufacturingDate: text("manufacturingDate"),
      expiryDate: text("expiryDate"),
      departmentCode: text("departmentCode"),
      costItemCode: text("costItemCode"),
      comments: text("comments"),
    };
    sendingRef.current = true;
    setSending(true);
    setErrorMessage("");
    const persist = (saved: SapProductionReceiptInput | null) => {
      try {
        if (saved) sessionStorage.setItem(storageKey, JSON.stringify(saved));
        else sessionStorage.removeItem(storageKey);
      } catch {
        // The UI still retains this request in memory.
      }
    };
    persist(payload);

    try {
      const receipt = await productionOrdersService.createSapProductionReceipt(
        summaryId,
        payload,
      );
      persist(null);
      setPending(null);
      setOpen(false);
      onCreated(receipt.DocNum);
      toast.success(`Đã tạo phiếu nhập kho sản xuất SAP #${receipt.DocNum}.`);
      void mutate([
        API_ROUTES.productionOrders.finishedProductSummarySapReceipts(
          summaryId,
        ),
        userId,
      ]).catch(() => {});
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const message = response?.data?.message;
      const uncertain = !response || response.status >= 500;
      setPending(uncertain ? payload : null);
      if (!uncertain) persist(null);
      const displayMessage =
        typeof message === "string"
          ? message
          : Array.isArray(message)
            ? "Vui lòng kiểm tra ngày, số lượng, mã kho, số lô và mã phân bổ."
            : uncertain
              ? "Chưa nhận được kết quả. Hãy bấm Kiểm tra kết quả."
              : "Không thể tạo phiếu nhập kho trên SAP.";
      setErrorMessage(displayMessage);
      toast.error(displayMessage);
      if (response?.status === 409) onConflict();
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const values = pending ?? {
    ...defaults,
    postingDate: postingDateFormatter.format(new Date()),
    departmentCode: "KHKV",
    costItemCode: "CP004",
  };
  return (
    <Dialog open={open} onOpenChange={toggleOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group inline-flex cursor-pointer flex-col items-center rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-blue-600 md:p-1"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white group-hover:bg-blue-600 md:h-10 md:w-10">
            <PackageCheck aria-hidden="true" className="size-5" />
          </span>
          <span className="mt-1 w-[68px] text-center text-xs font-semibold leading-tight text-gray-700 md:w-[90px] md:text-sm">
            Nhập kho sản xuất
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
        showCloseButton={!sending}
      >
        <DialogHeader>
          <DialogTitle>Nhập kho sản xuất</DialogTitle>
          <DialogDescription>{orderLabel}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <fieldset
            className="grid gap-3 sm:grid-cols-2"
            disabled={sending || pending !== null}
          >
            {fields.map(({ name, label, ...inputProps }) => (
              <label key={name} className="grid gap-1.5 text-sm font-medium">
                {label}
                <Input
                  name={name}
                  defaultValue={values[name] ?? ""}
                  required
                  {...inputProps}
                />
              </label>
            ))}
            <label className="col-span-full grid gap-1.5 text-sm font-medium">
              Ghi chú
              <Textarea
                name="comments"
                defaultValue={values.comments}
                maxLength={254}
              />
            </label>
            <label className="col-span-full grid gap-1.5 text-sm font-medium">
              Ghi chú nhật ký
              <Input value="Nhập kho sản xuất" readOnly />
            </label>
          </fieldset>
          {errorMessage && (
            <p role="alert" className="text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => toggleOpen(false)}
            >
              {pending ? "Đóng" : "Hủy"}
            </Button>
            <Button type="submit" disabled={sending}>
              {sending && (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              )}
              {sending ? "Đang xử lý…" : pending ? "Kiểm tra kết quả" : "Nhập"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
