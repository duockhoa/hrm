"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
import type {
  ProductionOrderShellWeightCheck,
  ShellWeightCheckPayload,
} from "../../types";
import {
  SHELL_WEIGHT_KEYS,
  SHELL_WEIGHT_UNIT,
  normalizeDecimalText,
  toNumber,
} from "../../utils";

const decimalPattern = /^\d{1,8}([.,]\d{1,2})?$/;

const weightText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${fieldLabel}`)
    .refine((value) => decimalPattern.test(value), {
      message: `${fieldLabel} tối đa 2 chữ số thập phân`,
    })
    .refine((value) => toNumber(value) > 0, {
      message: `${fieldLabel} phải lớn hơn 0`,
    });

const formSchema = z.object({
  shell_1_weight: weightText("khối lượng vỏ 1"),
  shell_2_weight: weightText("khối lượng vỏ 2"),
  shell_3_weight: weightText("khối lượng vỏ 3"),
  shell_4_weight: weightText("khối lượng vỏ 4"),
  shell_5_weight: weightText("khối lượng vỏ 5"),
  shell_6_weight: weightText("khối lượng vỏ 6"),
  shell_7_weight: weightText("khối lượng vỏ 7"),
  shell_8_weight: weightText("khối lượng vỏ 8"),
  shell_9_weight: weightText("khối lượng vỏ 9"),
  shell_10_weight: weightText("khối lượng vỏ 10"),
});

type FormValues = z.infer<typeof formSchema>;

const toFormValues = (data: ProductionOrderShellWeightCheck): FormValues =>
  SHELL_WEIGHT_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]:
        data[key] === null || data[key] === undefined
          ? ""
          : String(data[key]),
    }),
    {} as FormValues,
  );

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditProductionOrderShellWeightCheckForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderShellWeightCheck;
  onCancel: () => void;
  onSaved?: (data: ProductionOrderShellWeightCheck) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(data),
  });

  useEffect(() => {
    form.reset(toFormValues(data));
  }, [data, form]);

  const onSubmit = async (values: FormValues) => {
    if (data.id === null || data.id === undefined) {
      toast.error("Không tìm thấy bản ghi khối lượng vỏ.");
      return;
    }

    const initialValues = toFormValues(data);
    const payload = SHELL_WEIGHT_KEYS.reduce((currentPayload, key) => {
      const nextValue = normalizeDecimalText(values[key]);
      const previousValue = normalizeDecimalText(initialValues[key]);

      if (nextValue !== previousValue) {
        currentPayload[key] = nextValue;
      }

      return currentPayload;
    }, {} as Partial<ShellWeightCheckPayload>);

    if (data.unit !== SHELL_WEIGHT_UNIT) {
      payload.unit = SHELL_WEIGHT_UNIT;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      const savedData =
        await productionOrdersService.updateShellWeightCheck(data.id, payload);

      toast.success("Đã cập nhật kiểm tra khối lượng vỏ.");
      await mutate(
        API_ROUTES.productionOrders.shellWeightCheckDetail(data.id),
      );
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.shellWeightChecks(
            data.production_order_id,
          ),
        );
      }
      onSaved?.(savedData);
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể cập nhật kiểm tra khối lượng vỏ.",
        ),
      );
      console.error("Error updating shell weight check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[620px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[588px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Cập nhật khối lượng vỏ
            </p>

            <div className="flex flex-col gap-4">
              {SHELL_WEIGHT_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>Vỏ {index + 1} (g)</FormLabel>
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
