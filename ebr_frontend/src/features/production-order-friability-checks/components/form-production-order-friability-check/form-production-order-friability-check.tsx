"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import type { FriabilityCheckPayload } from "../../types";
import {
  formatPercent,
  normalizeDecimalText,
  toNumber,
} from "../../utils";

const decimalPattern = /^\d{1,9}([.,]\d{1,3})?$/;

const weightText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${fieldLabel}`)
    .refine((value) => decimalPattern.test(value), {
      message: `${fieldLabel} tối đa 3 chữ số thập phân`,
    })
    .refine((value) => toNumber(value) > 0, {
      message: `${fieldLabel} phải lớn hơn 0`,
    });

const formSchema = z
  .object({
    total_weight_before_check: weightText("khối lượng trước kiểm tra"),
    total_weight_after_check: weightText("khối lượng sau kiểm tra"),
  })
  .refine(
    (values) =>
      toNumber(values.total_weight_after_check) <=
      toNumber(values.total_weight_before_check),
    {
      message:
        "Khối lượng sau kiểm tra phải nhỏ hơn hoặc bằng khối lượng trước kiểm tra",
      path: ["total_weight_after_check"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  total_weight_before_check: "",
  total_weight_after_check: "",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const formatFriabilityPreview = (beforeValue: string, afterValue: string) => {
  if (!beforeValue || !afterValue) {
    return "";
  }

  const before = toNumber(beforeValue);
  const after = toNumber(afterValue);

  if (
    Number.isNaN(before) ||
    Number.isNaN(after) ||
    before <= 0 ||
    after > before
  ) {
    return "";
  }

  return formatPercent(((before - after) / before) * 100);
};

export default function FormProductionOrderFriabilityCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const friabilityChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.friabilityChecks(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  const [totalWeightBeforeCheck, totalWeightAfterCheck] = useWatch({
    control: form.control,
    name: ["total_weight_before_check", "total_weight_after_check"],
  });

  const friabilityPreview = formatFriabilityPreview(
    totalWeightBeforeCheck,
    totalWeightAfterCheck,
  );

  const resetForm = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const payload: FriabilityCheckPayload = {
      total_weight_before_check: normalizeDecimalText(
        values.total_weight_before_check,
      ),
      total_weight_after_check: normalizeDecimalText(
        values.total_weight_after_check,
      ),
    };

    try {
      await productionOrdersService.createFriabilityCheck(
        productionOrderId,
        payload,
      );

      toast.success("Đã lưu kiểm tra độ mài mòn.");
      resetForm();
      await mutate(friabilityChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu kiểm tra độ mài mòn."),
      );
      console.error("Error creating friability check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[360px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[328px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Kiểm tra độ mài mòn
            </p>

            <FormField
              control={form.control}
              name="total_weight_before_check"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Khối lượng trước kiểm tra (mg)</FormLabel>
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
              name="total_weight_after_check"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Khối lượng sau kiểm tra (mg)</FormLabel>
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

            <div className="space-y-2">
              <FormLabel>Độ mài mòn tính toán (%)</FormLabel>
              <Input
                readOnly
                tabIndex={-1}
                value={friabilityPreview}
                className="bg-gray-50 font-semibold text-gray-900"
              />
              <p className="text-xs text-gray-500">
                Backend sẽ tự tính và lưu theo khối lượng trước/sau kiểm tra.
              </p>
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
