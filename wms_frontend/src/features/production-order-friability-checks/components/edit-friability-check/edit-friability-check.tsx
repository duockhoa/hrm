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
import type {
  FriabilityCheckPayload,
  ProductionOrderFriabilityCheck,
} from "../../types";
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

const toFormValues = (data: ProductionOrderFriabilityCheck): FormValues => ({
  total_weight_before_check:
    data.total_weight_before_check === null ||
    data.total_weight_before_check === undefined
      ? ""
      : String(data.total_weight_before_check),
  total_weight_after_check:
    data.total_weight_after_check === null ||
    data.total_weight_after_check === undefined
      ? ""
      : String(data.total_weight_after_check),
});

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

export default function EditFriabilityCheckForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderFriabilityCheck;
  onCancel: () => void;
  onSaved?: (data: ProductionOrderFriabilityCheck) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(data),
  });
  const [totalWeightBeforeCheck, totalWeightAfterCheck] = useWatch({
    control: form.control,
    name: ["total_weight_before_check", "total_weight_after_check"],
  });

  const friabilityPreview = formatFriabilityPreview(
    totalWeightBeforeCheck,
    totalWeightAfterCheck,
  );

  const onSubmit = async (values: FormValues) => {
    if (data.id === null || data.id === undefined) {
      toast.error("Không tìm thấy bản ghi kiểm tra độ mài mòn.");
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
      const savedData = await productionOrdersService.updateFriabilityCheck(
        data.id,
        payload,
      );

      toast.success("Đã cập nhật kiểm tra độ mài mòn.");
      await mutate(API_ROUTES.productionOrders.friabilityCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.friabilityChecks(
            data.production_order_id,
          ),
        );
      }
      onSaved?.(savedData);
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật kiểm tra độ mài mòn."),
      );
      console.error("Error updating friability check:", error);
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
              Cập nhật kiểm tra độ mài mòn
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
              onClick={onCancel}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {form.formState.isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
