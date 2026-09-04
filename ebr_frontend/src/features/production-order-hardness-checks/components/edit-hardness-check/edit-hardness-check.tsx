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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type {
  ProductionOrderHardnessCheck,
  UpdateHardnessCheckPayload,
} from "../../types";
import {
  HARDNESS_KEYS,
  OPTIONAL_HARDNESS_KEYS,
  normalizeDecimalText,
  toNumber,
} from "../../utils";

const decimalPattern = /^\d{1,7}([.,]\d{1,3})?$/;

const requiredHardnessText = (fieldLabel: string) =>
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

const optionalHardnessText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || decimalPattern.test(value), {
      message: `${fieldLabel} tối đa 3 chữ số thập phân`,
    })
    .refine((value) => !value || toNumber(value) > 0, {
      message: `${fieldLabel} phải lớn hơn 0`,
    });

const formSchema = z.object({
  requirement: z.string().trim(),
  unit_1_hardness: requiredHardnessText("độ cứng viên 1"),
  unit_2_hardness: optionalHardnessText("độ cứng viên 2"),
  unit_3_hardness: optionalHardnessText("độ cứng viên 3"),
  unit_4_hardness: optionalHardnessText("độ cứng viên 4"),
  unit_5_hardness: optionalHardnessText("độ cứng viên 5"),
  unit_6_hardness: optionalHardnessText("độ cứng viên 6"),
  unit_7_hardness: optionalHardnessText("độ cứng viên 7"),
  unit_8_hardness: optionalHardnessText("độ cứng viên 8"),
  unit_9_hardness: optionalHardnessText("độ cứng viên 9"),
  unit_10_hardness: optionalHardnessText("độ cứng viên 10"),
});

type FormValues = z.infer<typeof formSchema>;

const toFormValues = (data: ProductionOrderHardnessCheck): FormValues => ({
  requirement: data.requirement ?? "",
  ...HARDNESS_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]:
        data[key] === null || data[key] === undefined ? "" : String(data[key]),
    }),
    {} as Omit<FormValues, "requirement">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditHardnessCheckForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderHardnessCheck;
  onCancel: () => void;
  onSaved?: (data: ProductionOrderHardnessCheck) => void;
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
      toast.error("Không tìm thấy bản ghi kiểm tra độ cứng.");
      return;
    }

    const payload: UpdateHardnessCheckPayload = {
      requirement: values.requirement.trim() || null,
      dosage_form_stage: data.dosage_form_stage ?? null,
      unit: "N",
      unit_1_hardness: normalizeDecimalText(values.unit_1_hardness),
    };

    OPTIONAL_HARDNESS_KEYS.forEach((key) => {
      const value = values[key].trim();
      payload[key] = value ? normalizeDecimalText(value) : null;
    });

    try {
      const savedData = await productionOrdersService.updateHardnessCheck(
        data.id,
        payload,
      );

      toast.success("Đã cập nhật kiểm tra độ cứng.");
      await mutate(API_ROUTES.productionOrders.hardnessCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.hardnessChecks(data.production_order_id),
        );
      }
      onSaved?.(savedData);
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật kiểm tra độ cứng."),
      );
      console.error("Error updating hardness check:", error);
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
              Cập nhật kiểm tra độ cứng
            </p>

            <FormField
              control={form.control}
              name="requirement"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Yêu cầu</FormLabel>
                    <FormControl>
                      <Textarea
                        readOnly
                        aria-readonly="true"
                        className="bg-gray-100 text-gray-700"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-4">
              {HARDNESS_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>
                          Viên {index + 1} (N)
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
