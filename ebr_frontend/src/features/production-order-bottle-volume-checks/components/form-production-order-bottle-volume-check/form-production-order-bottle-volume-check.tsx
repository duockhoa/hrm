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
import type { BottleVolumeCheckPayload } from "../../types";
import {
  BOTTLE_VOLUME_KEYS,
  normalizeDecimalText,
  toNumber,
} from "../../utils";

const decimalPattern = /^\d{1,8}([.,]\d{1,2})?$/;

const volumeText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || decimalPattern.test(value), {
      message: `${fieldLabel} tối đa 2 chữ số thập phân`,
    })
    .refine((value) => !value || toNumber(value) > 0, {
      message: `${fieldLabel} phải lớn hơn 0`,
    });

const formSchema = z
  .object({
    bottle_1_volume: volumeText("thể tích lọ 1"),
    bottle_2_volume: volumeText("thể tích lọ 2"),
    bottle_3_volume: volumeText("thể tích lọ 3"),
    bottle_4_volume: volumeText("thể tích lọ 4"),
    bottle_5_volume: volumeText("thể tích lọ 5"),
    bottle_6_volume: volumeText("thể tích lọ 6"),
  })
  .refine(
    (values) => BOTTLE_VOLUME_KEYS.some((key) => values[key].trim() !== ""),
    {
      message: "Vui lòng nhập ít nhất 1 thể tích lọ.",
      path: ["bottle_1_volume"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const defaultValues = BOTTLE_VOLUME_KEYS.reduce(
  (values, key) => ({
    ...values,
    [key]: "",
  }),
  {} as FormValues,
);

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderBottleVolumeCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const bottleVolumeChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.bottleVolumeChecks(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const resetForm = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const payload = BOTTLE_VOLUME_KEYS.reduce((currentPayload, key) => {
      const value = values[key].trim();

      if (!value) {
        return currentPayload;
      }

      return {
        ...currentPayload,
        [key]: normalizeDecimalText(value),
      };
    }, {} as BottleVolumeCheckPayload);

    try {
      await productionOrdersService.createBottleVolumeCheck(
        productionOrderId,
        payload,
      );

      toast.success("Đã lưu kiểm tra thể tích lọ.");
      resetForm();
      await mutate(bottleVolumeChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu kiểm tra thể tích lọ."),
      );
      console.error("Error creating bottle volume check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[500px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[468px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Kiểm tra thể tích lọ
            </p>

            <div className="flex flex-col gap-4">
              {BOTTLE_VOLUME_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>Thể tích lọ {index + 1} (ml)</FormLabel>
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
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={resetForm}
            >
              Đặt lại
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
