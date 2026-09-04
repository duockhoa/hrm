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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderVolumeCheck, VolumeCheckPayload } from "../../types";
import {
  normalizeDecimalText,
  toNumber,
  VOLUME_KEYS,
} from "../../utils";

const decimalPattern = /^\d{1,8}([.,]\d{1,2})?$/;

const requiredVolumeText = (fieldLabel: string) =>
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

const optionalVolumeText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || decimalPattern.test(value), {
      message: `${fieldLabel} tối đa 2 chữ số thập phân`,
    })
    .refine((value) => !value || toNumber(value) > 0, {
      message: `${fieldLabel} phải lớn hơn 0`,
    });

const formSchema = z.object({
  requirement: z.string().trim(),
  dosage_form_stage: z.string().trim().max(50, {
    message: "Dạng bào chế tối đa 50 ký tự",
  }),
  unit_1_volume: requiredVolumeText("thể tích đơn vị 1"),
  unit_2_volume: optionalVolumeText("thể tích đơn vị 2"),
  unit_3_volume: optionalVolumeText("thể tích đơn vị 3"),
  unit_4_volume: optionalVolumeText("thể tích đơn vị 4"),
  unit_5_volume: optionalVolumeText("thể tích đơn vị 5"),
  unit_6_volume: optionalVolumeText("thể tích đơn vị 6"),
});

type FormValues = z.infer<typeof formSchema>;

const toInputValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value).replace(".", ",");

const toFormValues = (data: ProductionOrderVolumeCheck): FormValues => ({
  requirement: String(data.requirement ?? ""),
  dosage_form_stage: String(data.dosage_form_stage ?? ""),
  ...VOLUME_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: toInputValue(data[key]),
    }),
    {} as Omit<FormValues, "requirement" | "dosage_form_stage">,
  ),
});

const normalizeOptionalVolume = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue ? normalizeDecimalText(trimmedValue) : null;
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditVolumeCheck({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderVolumeCheck;
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

    const payload: Partial<VolumeCheckPayload> = {};
    const nextRequirement = values.requirement.trim();
    const previousRequirement = initialValues.requirement.trim();
    const nextDosageFormStage = values.dosage_form_stage.trim();
    const previousDosageFormStage = initialValues.dosage_form_stage.trim();

    if (nextRequirement !== previousRequirement) {
      payload.requirement = nextRequirement || null;
    }

    if (nextDosageFormStage !== previousDosageFormStage) {
      payload.dosage_form_stage = nextDosageFormStage || null;
    }

    VOLUME_KEYS.forEach((key) => {
      const nextValue =
        key === "unit_1_volume"
          ? normalizeDecimalText(values[key])
          : normalizeOptionalVolume(values[key]);
      const previousValue =
        key === "unit_1_volume"
          ? normalizeDecimalText(initialValues[key])
          : normalizeOptionalVolume(initialValues[key]);

      if (nextValue !== previousValue) {
        payload[key] = nextValue;
      }
    });

    if (Object.keys(payload).length === 0) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      await productionOrdersService.updateVolumeCheck(data.id, payload);
      toast.success("Đã cập nhật kiểm tra thể tích.");
      await mutate(API_ROUTES.productionOrders.volumeCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.volumeChecks(data.production_order_id),
        );
      }
      onSaved?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật kiểm tra thể tích."),
      );
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            Cập nhật kiểm tra thể tích
          </p>

          <FormField
            control={form.control}
            name="requirement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yêu cầu</FormLabel>
                <FormControl>
                  <Textarea
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
            name="dosage_form_stage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dạng bào chế</FormLabel>
                <FormControl>
                  <Input
                    disabled={form.formState.isSubmitting}
                    placeholder="oral_solution"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {VOLUME_KEYS.map((name, index) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đơn vị {index + 1} (ml)</FormLabel>
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
          ))}

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
