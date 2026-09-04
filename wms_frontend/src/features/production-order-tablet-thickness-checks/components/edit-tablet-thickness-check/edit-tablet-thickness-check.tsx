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
  ProductionOrderTabletThicknessCheck,
  UpdateTabletThicknessCheckPayload,
} from "../../types";
import {
  OPTIONAL_TABLET_THICKNESS_KEYS,
  TABLET_THICKNESS_KEYS,
  normalizeDecimalText,
  toNumber,
} from "../../utils";

const decimalPattern = /^\d{1,7}([.,]\d{1,3})?$/;
const required = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${label}`)
    .refine((value) => decimalPattern.test(value), {
      message: `${label} tối đa 3 chữ số thập phân`,
    })
    .refine((value) => toNumber(value) > 0, {
      message: `${label} phải lớn hơn 0`,
    });
const optional = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || decimalPattern.test(value), {
      message: `${label} tối đa 3 chữ số thập phân`,
    })
    .refine((value) => !value || toNumber(value) > 0, {
      message: `${label} phải lớn hơn 0`,
    });

const formSchema = z.object({
  requirement: z.string().trim(),
  unit_1_thickness: required("chiều dày viên 1"),
  unit_2_thickness: optional("chiều dày viên 2"),
  unit_3_thickness: optional("chiều dày viên 3"),
  unit_4_thickness: optional("chiều dày viên 4"),
  unit_5_thickness: optional("chiều dày viên 5"),
  unit_6_thickness: optional("chiều dày viên 6"),
  unit_7_thickness: optional("chiều dày viên 7"),
  unit_8_thickness: optional("chiều dày viên 8"),
  unit_9_thickness: optional("chiều dày viên 9"),
  unit_10_thickness: optional("chiều dày viên 10"),
});
type FormValues = z.infer<typeof formSchema>;

const toFormValues = (data: ProductionOrderTabletThicknessCheck): FormValues => ({
  requirement: data.requirement ?? "",
  ...TABLET_THICKNESS_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: data[key] === null || data[key] === undefined ? "" : String(data[key]),
    }),
    {} as Omit<FormValues, "requirement">,
  ),
});

export default function EditTabletThicknessCheck({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderTabletThicknessCheck;
  onCancel: () => void;
  onSaved?: (data: ProductionOrderTabletThicknessCheck) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(data),
  });

  useEffect(() => form.reset(toFormValues(data)), [data, form]);

  const onSubmit = async (values: FormValues) => {
    if (data.id === null || data.id === undefined) {
      toast.error("Không tìm thấy bản ghi kiểm tra độ dày viên nén.");
      return;
    }

    const payload: UpdateTabletThicknessCheckPayload = {
      requirement: values.requirement.trim() || null,
      dosage_form_stage: data.dosage_form_stage ?? null,
      unit: data.unit || "mm",
      unit_1_thickness: normalizeDecimalText(values.unit_1_thickness),
    };
    OPTIONAL_TABLET_THICKNESS_KEYS.forEach((key) => {
      const value = values[key].trim();
      payload[key] = value ? normalizeDecimalText(value) : null;
    });

    try {
      const savedData = await productionOrdersService.updateTabletThicknessCheck(
        data.id,
        payload,
      );
      toast.success("Đã cập nhật kiểm tra độ dày viên nén.");
      await mutate(API_ROUTES.productionOrders.tabletThicknessCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.tabletThicknessChecks(data.production_order_id),
        );
      }
      onSaved?.(savedData);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          "Không thể cập nhật kiểm tra độ dày viên nén.",
      );
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
              Cập nhật kiểm tra độ dày viên nén
            </p>
            <FormField
              control={form.control}
              name="requirement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yêu cầu</FormLabel>
                  <FormControl>
                    <Textarea readOnly aria-readonly="true" className="bg-gray-100 text-gray-700" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {TABLET_THICKNESS_KEYS.map((key, index) => (
              <FormField
                key={key}
                control={form.control}
                name={key}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Viên {index + 1} (mm)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" disabled={form.formState.isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onCancel}>
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
