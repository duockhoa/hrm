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
  ProductionOrderSemiFinishedGrossWeightCheck,
  UpdateSemiFinishedGrossWeightCheckPayload,
} from "../../types";
import {
  OPTIONAL_SEMI_FINISHED_GROSS_WEIGHT_KEYS,
  SEMI_FINISHED_GROSS_WEIGHT_KEYS,
  normalizeDecimalText,
  toNumber,
} from "../../utils";

const decimalPattern = /^\d{1,7}([.,]\d{1,3})?$/;

const requiredWeightText = (fieldLabel: string) =>
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

const optionalWeightText = (fieldLabel: string) =>
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
  dosage_form_stage: z.string().trim().max(50, {
    message: "Dạng bào chế tối đa 50 ký tự",
  }),
  unit_1_gross_weight: requiredWeightText("khối lượng gói 1"),
  unit_2_gross_weight: optionalWeightText("khối lượng gói 2"),
  unit_3_gross_weight: optionalWeightText("khối lượng gói 3"),
  unit_4_gross_weight: optionalWeightText("khối lượng gói 4"),
  unit_5_gross_weight: optionalWeightText("khối lượng gói 5"),
  unit_6_gross_weight: optionalWeightText("khối lượng gói 6"),
  unit_7_gross_weight: optionalWeightText("khối lượng gói 7"),
  unit_8_gross_weight: optionalWeightText("khối lượng gói 8"),
  unit_9_gross_weight: optionalWeightText("khối lượng gói 9"),
  unit_10_gross_weight: optionalWeightText("khối lượng gói 10"),
});

type FormValues = z.infer<typeof formSchema>;

const toFormValues = (
  data: ProductionOrderSemiFinishedGrossWeightCheck,
  requirement?: string,
): FormValues => ({
  requirement: requirement ?? data.requirement ?? "",
  dosage_form_stage: data.dosage_form_stage ?? "",
  ...SEMI_FINISHED_GROSS_WEIGHT_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]:
        data[key] === null || data[key] === undefined
          ? ""
          : String(data[key]),
    }),
    {} as Omit<FormValues, "requirement" | "dosage_form_stage">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditProductionOrderSemiFinishedGrossWeightCheckForm({
  data,
  requirement,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderSemiFinishedGrossWeightCheck;
  requirement?: string;
  onCancel: () => void;
  onSaved?: (data: ProductionOrderSemiFinishedGrossWeightCheck) => void;
}) {
  const requirementValue = requirement ?? data.requirement ?? "";
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(data, requirementValue),
  });

  useEffect(() => {
    form.reset(toFormValues(data, requirementValue));
  }, [data, form, requirementValue]);

  const onSubmit = async (values: FormValues) => {
    if (data.id === null || data.id === undefined) {
      toast.error("Không tìm thấy bản ghi kiểm tra khối lượng gói cốm.");
      return;
    }

    const payload: UpdateSemiFinishedGrossWeightCheckPayload = {
      requirement: values.requirement.trim(),
      dosage_form_stage: values.dosage_form_stage.trim() || null,
      unit_1_gross_weight: normalizeDecimalText(values.unit_1_gross_weight),
    };

    OPTIONAL_SEMI_FINISHED_GROSS_WEIGHT_KEYS.forEach((key) => {
      const value = values[key].trim();
      payload[key] = value ? normalizeDecimalText(value) : null;
    });

    try {
      const savedData =
        await productionOrdersService.updateSemiFinishedGrossWeightCheck(
          data.id,
          payload,
        );

      toast.success("Đã cập nhật kiểm tra khối lượng gói cốm.");
      await mutate(
        API_ROUTES.productionOrders.semiFinishedGrossWeightCheckDetail(data.id),
      );
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.semiFinishedGrossWeightChecks(
            data.production_order_id,
          ),
        );
      }
      onSaved?.(savedData);
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật kiểm tra khối lượng gói cốm."),
      );
      console.error("Error updating semi-finished gross weight check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[560px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[528px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Cập nhật kiểm tra khối lượng gói cốm
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

            <FormField
              control={form.control}
              name="dosage_form_stage"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Dạng bào chế</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="Gói cốm, Gói dịch, Viên nang"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-4">
              {SEMI_FINISHED_GROSS_WEIGHT_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>Gói {index + 1} (g)</FormLabel>
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
