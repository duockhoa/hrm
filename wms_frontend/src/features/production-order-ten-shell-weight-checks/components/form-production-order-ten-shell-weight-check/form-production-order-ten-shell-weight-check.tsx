"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import useSWR from "swr";
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
import type { ProductionOrderTenShellWeightCheck } from "../../types";
import { normalizeDecimalText, toNumber } from "../../utils";

const decimalPattern = /^\d{1,8}([.,]\d{1,2})?$/;

const formSchema = z.object({
  ten_shells_weight: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập khối lượng 10 vỏ")
    .refine((value) => decimalPattern.test(value), {
      message: "Khối lượng phải đúng DECIMAL(10, 2), tối đa 2 chữ số thập phân",
    })
    .refine((value) => toNumber(value) > 0, {
      message: "Khối lượng phải lớn hơn 0",
    }),
});

type FormValues = z.infer<typeof formSchema>;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const getDefaultValues = (
  data?: ProductionOrderTenShellWeightCheck | null,
): FormValues => ({
  ten_shells_weight:
    data?.ten_shells_weight === null || data?.ten_shells_weight === undefined
      ? ""
      : String(data.ten_shells_weight).replace(".", ","),
});

export default function FormProductionOrderTenShellWeightCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const tenShellWeightCheckKey = productionOrderId
    ? API_ROUTES.productionOrders.tenShellWeightCheck(productionOrderId)
    : null;

  const { data } = useSWR<ProductionOrderTenShellWeightCheck | null>(
    tenShellWeightCheckKey,
    () => productionOrdersService.fetchTenShellWeightCheck(productionOrderId),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (data !== undefined) {
      form.reset(getDefaultValues(data));
    }
  }, [data, form]);

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    try {
      await productionOrdersService.upsertTenShellWeightCheck(
        productionOrderId,
        {
          ten_shells_weight: normalizeDecimalText(values.ten_shells_weight),
        },
      );

      toast.success("Đã lưu khối lượng 10 vỏ.");
      await mutate(tenShellWeightCheckKey);
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể lưu khối lượng 10 vỏ."));
      console.error("Error saving ten-shell weight check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[240px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[208px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Khối lượng 10 vỏ
            </p>

            <FormField
              control={form.control}
              name="ten_shells_weight"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Khối lượng 10 vỏ (mg)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        placeholder="980"
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => form.reset(getDefaultValues(data))}
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
