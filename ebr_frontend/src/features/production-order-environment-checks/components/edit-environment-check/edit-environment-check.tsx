"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import * as z from "zod";
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

type EnvironmentCheck = {
  id?: string | number;
  production_order_id?: string | number | null;
  room?: string | null;
  temperature_c?: string | number | null;
  humidity_percent?: string | number | null;
  checked_at?: string | null;
};

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
  checked_at: z.string().trim().min(1, "Vui lòng nhập thời điểm kiểm tra"),
});

type FormValues = z.infer<typeof formSchema>;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const toDateTimeLocalValue = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const toFormValues = (data: EnvironmentCheck): FormValues => ({
  room: data.room ?? "",
  temperature_c: String(data.temperature_c ?? ""),
  humidity_percent: String(data.humidity_percent ?? ""),
  checked_at: toDateTimeLocalValue(data.checked_at),
});

const normalizeDateTimeValue = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

export default function EditEnvironmentCheck({
  data,
  onCancel,
  onSaved,
}: {
  data: EnvironmentCheck;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const initialValues = toFormValues(data);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: FormValues) => {
    if (data.id === undefined || data.id === null) {
      return;
    }

    const payload: Partial<{
      room: string;
      temperature_c: string;
      humidity_percent: string;
      checked_at: string;
    }> = {};
    const nextRoom = values.room.trim();
    const nextTemperature = normalizeDecimalText(values.temperature_c);
    const nextHumidity = normalizeDecimalText(values.humidity_percent);
    const nextCheckedAt = normalizeDateTimeValue(values.checked_at);
    const previousCheckedAt = normalizeDateTimeValue(initialValues.checked_at);

    if (nextRoom !== initialValues.room.trim()) {
      payload.room = nextRoom;
    }

    if (nextTemperature !== normalizeDecimalText(initialValues.temperature_c)) {
      payload.temperature_c = nextTemperature;
    }

    if (nextHumidity !== normalizeDecimalText(initialValues.humidity_percent)) {
      payload.humidity_percent = nextHumidity;
    }

    if (nextCheckedAt !== previousCheckedAt) {
      payload.checked_at = nextCheckedAt;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      await productionOrdersService.updateEnvironmentCheck(data.id, payload);
      toast.success("Đã cập nhật nhiệt độ và độ ẩm.");
      await mutate(API_ROUTES.productionOrders.environmentCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.environmentChecks(
            data.production_order_id,
          ),
        );
      }
      onSaved?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể cập nhật nhiệt độ và độ ẩm."));
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            Cập nhật nhiệt độ độ ẩm
          </p>

          <FormField
            control={form.control}
            name="room"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phòng</FormLabel>
                <FormControl>
                  <Input disabled={form.formState.isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="temperature_c"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nhiệt độ (°C)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="humidity_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Độ ẩm (%)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="checked_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thời điểm kiểm tra</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  />
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
    </div>
  );
}
