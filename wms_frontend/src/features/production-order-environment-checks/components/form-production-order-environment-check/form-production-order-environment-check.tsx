"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import * as z from "zod";
import { QrInputButton, QrScanDialog } from "@/components/qr-scan-dialog/qr-scan-dialog";
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
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";

const normalizeDecimalText = (value: string) => value.trim().replace(",", ".");

const numericText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${fieldLabel}`)
    .refine((value) => !Number.isNaN(Number(normalizeDecimalText(value))), {
      message: `${fieldLabel} không hợp lệ`,
    });

const formSchema = z.object({
  room: z.string().trim().min(1, "Vui lòng nhập phòng kiểm tra"),
  temperature_c: numericText("nhiệt độ"),
  humidity_percent: numericText("độ ẩm").refine(
    (value) => {
      const humidity = Number(normalizeDecimalText(value));
      return humidity >= 0 && humidity <= 100;
    },
    { message: "Độ ẩm phải từ 0 đến 100" },
  ),
});

type FormValues = z.infer<typeof formSchema>;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const roomQrKeys = ["room", "phong", "phòng", "room_name", "room_code"];

const getValueByKeys = (source: Record<string, unknown>, keys: string[]) => {
  const sourceEntries = Object.entries(source);

  for (const key of keys) {
    const match = sourceEntries.find(
      ([sourceKey]) => sourceKey.toLowerCase() === key.toLowerCase(),
    );

    if (match?.[1] !== undefined && match[1] !== null) {
      return String(match[1]);
    }
  }

  return null;
};

const parseQrRoom = (decodedText: string) => {
  const text = decodedText.trim();

  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const value = getValueByKeys(json as Record<string, unknown>, roomQrKeys);
      if (value) {
        return value.trim();
      }
    }
  } catch {
    // QR may be plain text, a URL, or query params.
  }

  try {
    const url = new URL(text);
    const value = getValueByKeys(
      Object.fromEntries(url.searchParams.entries()),
      roomQrKeys,
    );
    if (value) {
      return value.trim();
    }
  } catch {
    const params = new URLSearchParams(text);
    const value = getValueByKeys(Object.fromEntries(params.entries()), roomQrKeys);
    if (value) {
      return value.trim();
    }
  }

  return text;
};

export default function FormProductionOrderEnvironmentCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const [isRoomQrScannerOpen, setIsRoomQrScannerOpen] = useState(false);
  const environmentChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.environmentChecks(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      room: "",
      temperature_c: "",
      humidity_percent: "",
    },
  });

  const handleQrScan = useCallback(
    (decodedText: string) => {
      const scannedValue = parseQrRoom(decodedText);

      if (!scannedValue) {
        toast.error("Không đọc được phòng từ mã QR.");
        return;
      }

      form.setValue("room", scannedValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success("Đã quét QR và điền phòng.");
    },
    [form],
  );

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    try {
      await productionOrdersService.createEnvironmentCheck(productionOrderId, {
        room: values.room.trim(),
        temperature_c: normalizeDecimalText(values.temperature_c),
        humidity_percent: normalizeDecimalText(values.humidity_percent),
        checked_at: new Date().toISOString(),
      });

      toast.success("Đã lưu nhiệt độ và độ ẩm.");
      form.reset({
        room: "",
        temperature_c: "",
        humidity_percent: "",
      });
      await mutate(environmentChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể lưu nhiệt độ và độ ẩm."));
      console.error("Error creating environment check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[300px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[268px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Kiểm tra nhiệt độ độ ẩm
            </p>

            <FormField
              control={form.control}
              name="room"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Phòng</FormLabel>
                    <FormControl>
                      <div className="relative w-full">
                        <Input
                          className="pr-11"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                        <QrInputButton
                          disabled={form.formState.isSubmitting}
                          onClick={() => setIsRoomQrScannerOpen(true)}
                        />
                      </div>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="temperature_c"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>
                        Nhiệt độ (°C)
                      </FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="humidity_percent"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>
                        Độ ẩm (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() =>
                form.reset({
                  room: "",
                  temperature_c: "",
                  humidity_percent: "",
                })
              }
            >
              Đặt lại
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </Form>
      <QrScanDialog
        open={isRoomQrScannerOpen}
        title="Quét QR phòng"
        onOpenChange={setIsRoomQrScannerOpen}
        onScan={handleQrScan}
      />
    </div>
  );
}
