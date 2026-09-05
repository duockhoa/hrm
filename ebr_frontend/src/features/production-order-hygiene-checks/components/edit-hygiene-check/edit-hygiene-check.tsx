"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import * as z from "zod";
import {
  QrInputButton,
  QrScanDialog,
} from "@/components/qr-scan-dialog/qr-scan-dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type {
  HygieneCheckPayload,
  ProductionOrderHygieneCheck,
} from "../../types";
import {
  ROOM_OR_EQUIPMENT_HTTP_ERROR,
  containsHttp,
  HYGIENE_CLEANING_TYPE_OPTIONS,
  HYGIENE_RESULT_OPTIONS,
  normalizeOptionalText,
  parseQrRoomOrEquipment,
} from "../../utils";
import HygieneResultToggle, {
  type HygieneResultValue,
} from "../hygiene-result-toggle/hygiene-result-toggle";

const cleaningTypeValues = HYGIENE_CLEANING_TYPE_OPTIONS.map(
  (option) => option.value,
);
const resultValues = HYGIENE_RESULT_OPTIONS.map((option) => option.value);

const formSchema = z.object({
  room_or_equipment: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập phòng/thiết bị")
    .max(255, "Phòng/thiết bị tối đa 255 ký tự")
    .refine((value) => !containsHttp(value), ROOM_OR_EQUIPMENT_HTTP_ERROR),
  cleaning_type: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn loại vệ sinh")
    .refine((value) => cleaningTypeValues.includes(value), {
      message: "Loại vệ sinh không hợp lệ",
    }),
  result: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn kết quả")
    .refine((value) => resultValues.includes(value), {
      message: "Kết quả không hợp lệ",
    }),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type HygieneCheckField = keyof HygieneCheckPayload;

const fields: HygieneCheckField[] = [
  "room_or_equipment",
  "cleaning_type",
  "result",
  "note",
];

const toFormValues = (data: ProductionOrderHygieneCheck): FormValues => ({
  room_or_equipment: data.room_or_equipment ?? "",
  cleaning_type: data.cleaning_type ?? "",
  result: data.result ?? "",
  note: data.note ?? "",
});

const normalizeFieldValue = (field: HygieneCheckField, value: string) => {
  if (field === "note") {
    return normalizeOptionalText(value);
  }

  return value.trim();
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditHygieneCheck({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderHygieneCheck;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const initialValues = toFormValues(data);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const handleQrScan = useCallback(
    (decodedText: string) => {
      const scannedValue = parseQrRoomOrEquipment(decodedText);

      if (!scannedValue) {
        toast.error("Không đọc được phòng/thiết bị từ mã QR.");
        return;
      }

      if (containsHttp(scannedValue)) {
        toast.error(ROOM_OR_EQUIPMENT_HTTP_ERROR);
        return;
      }

      form.setValue("room_or_equipment", scannedValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success("Đã quét QR và điền phòng/thiết bị.");
    },
    [form],
  );

  const onSubmit = async (values: FormValues) => {
    if (data.id === undefined || data.id === null) {
      return;
    }

    const payload: Partial<HygieneCheckPayload> = {};
    fields.forEach((field) => {
      const nextValue = normalizeFieldValue(field, values[field] ?? "");
      const previousValue = normalizeFieldValue(
        field,
        initialValues[field] ?? "",
      );

      if (nextValue !== previousValue) {
        payload[field] = nextValue as never;
      }
    });

    if (Object.keys(payload).length === 0) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      await productionOrdersService.updateHygieneCheck(data.id, payload);
      toast.success("Đã cập nhật kiểm tra vệ sinh.");
      await mutate(API_ROUTES.productionOrders.hygieneCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.hygieneChecks(data.production_order_id),
        );
      }
      onSaved?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật kiểm tra vệ sinh."),
      );
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            Cập nhật kiểm tra vệ sinh
          </p>

          <FormField
            control={form.control}
            name="room_or_equipment"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-2">
                  <FormLabel>Phòng/thiết bị</FormLabel>
                  <FormControl>
                    <div className="relative w-full">
                      <Input
                        className="pr-11"
                        disabled={form.formState.isSubmitting}
                        {...field}
                        onChange={(event) => {
                          if (containsHttp(event.target.value)) {
                            toast.error(ROOM_OR_EQUIPMENT_HTTP_ERROR);
                            return;
                          }
                          field.onChange(event);
                        }}
                      />
                      <QrInputButton
                        disabled={form.formState.isSubmitting}
                        onClick={() => setIsQrScannerOpen(true)}
                      />
                    </div>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cleaning_type"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-2">
                  <FormLabel>Loại vệ sinh</FormLabel>
                  <Select
                    value={field.value}
                    disabled={form.formState.isSubmitting}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn loại vệ sinh" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HYGIENE_CLEANING_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-2">
                  <FormLabel>Kết quả</FormLabel>
                  <FormControl>
                    <HygieneResultToggle
                      value={field.value as HygieneResultValue}
                      disabled={form.formState.isSubmitting}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ghi chú</FormLabel>
                <FormControl>
                  <Textarea disabled={form.formState.isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </div>
        </form>
      </Form>
      <QrScanDialog
        open={isQrScannerOpen}
        title="Quét QR phòng/thiết bị"
        onOpenChange={setIsQrScannerOpen}
        onScan={handleQrScan}
      />
    </div>
  );
}
