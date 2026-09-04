"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
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
import productionSpecificationsService from "@/services/production-specifications.service";
import type { CreateHardnessCheckPayload } from "../../types";
import {
  HARDNESS_KEYS,
  OPTIONAL_HARDNESS_KEYS,
  buildHardnessRequirement,
  hasHardnessSpecificationLimits,
  normalizeDecimalText,
  toNumber,
  type HardnessSpecificationLimits,
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

const createDefaultValues = (requirement = ""): FormValues => ({
  requirement,
  ...HARDNESS_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: "",
    }),
    {} as Omit<FormValues, "requirement">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderHardnessCheck({
  productionOrderId,
  itemCode,
  productionSpecification,
  title = "Kiểm tra độ cứng viên nén",
  dosageFormStage = "tablet",
  unitLabel = "Viên",
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  productionSpecification?: HardnessSpecificationLimits;
  title?: string;
  dosageFormStage?: string;
  unitLabel?: string;
  onClose?: () => void;
}) {
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const hasProductionSpecificationFromOrder =
    hasHardnessSpecificationLimits(productionSpecification);
  const { data: fetchedProductionSpecification } = useSWR(
    !hasProductionSpecificationFromOrder && itemCodeValue
      ? `${API_ROUTES.productionSpecifications.base}/${itemCodeValue}`
      : null,
    () =>
      productionSpecificationsService.fetchProductionSpecificationByItemCode(
        itemCodeValue,
      ),
  );
  const specification = hasProductionSpecificationFromOrder
    ? productionSpecification
    : fetchedProductionSpecification;
  const requirementValue = buildHardnessRequirement(specification);
  const hardnessChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.hardnessChecks(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(requirementValue),
  });

  useEffect(() => {
    form.setValue("requirement", requirementValue);
  }, [form, requirementValue]);

  const resetForm = () => {
    form.reset(createDefaultValues(requirementValue));
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const requirement = values.requirement.trim();
    const payload: CreateHardnessCheckPayload = {
      dosage_form_stage: dosageFormStage,
      unit: "N",
      unit_1_hardness: normalizeDecimalText(values.unit_1_hardness),
    };

    if (requirement) {
      payload.requirement = requirement;
    }

    OPTIONAL_HARDNESS_KEYS.forEach((key) => {
      const value = values[key].trim();

      if (value) {
        payload[key] = normalizeDecimalText(value);
      }
    });

    try {
      await productionOrdersService.createHardnessCheck(
        productionOrderId,
        payload,
      );

      toast.success(`Đã lưu ${title.toLocaleLowerCase("vi-VN")}.`);
      resetForm();
      await mutate(hardnessChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể lưu kiểm tra độ cứng."));
      console.error("Error creating hardness check:", error);
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
              {title}
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
                        placeholder=""
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
                          {unitLabel} {index + 1} (N)
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
