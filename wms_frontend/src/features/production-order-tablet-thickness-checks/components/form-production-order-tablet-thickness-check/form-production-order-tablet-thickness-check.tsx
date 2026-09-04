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
import type { CreateTabletThicknessCheckPayload } from "../../types";
import {
  OPTIONAL_TABLET_THICKNESS_KEYS,
  TABLET_THICKNESS_KEYS,
  buildTabletThicknessRequirement,
  hasTabletThicknessSpecification,
  normalizeDecimalText,
  toNumber,
  type TabletThicknessSpecification,
} from "../../utils";

const decimalPattern = /^\d{1,7}([.,]\d{1,3})?$/;

const requiredThicknessText = (fieldLabel: string) =>
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

const optionalThicknessText = (fieldLabel: string) =>
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
  unit_1_thickness: requiredThicknessText("chiều dày viên 1"),
  unit_2_thickness: optionalThicknessText("chiều dày viên 2"),
  unit_3_thickness: optionalThicknessText("chiều dày viên 3"),
  unit_4_thickness: optionalThicknessText("chiều dày viên 4"),
  unit_5_thickness: optionalThicknessText("chiều dày viên 5"),
  unit_6_thickness: optionalThicknessText("chiều dày viên 6"),
  unit_7_thickness: optionalThicknessText("chiều dày viên 7"),
  unit_8_thickness: optionalThicknessText("chiều dày viên 8"),
  unit_9_thickness: optionalThicknessText("chiều dày viên 9"),
  unit_10_thickness: optionalThicknessText("chiều dày viên 10"),
});

type FormValues = z.infer<typeof formSchema>;

const createDefaultValues = (requirement = ""): FormValues => ({
  requirement,
  ...TABLET_THICKNESS_KEYS.reduce(
    (values, key) => ({ ...values, [key]: "" }),
    {} as Omit<FormValues, "requirement">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderTabletThicknessCheck({
  productionOrderId,
  itemCode,
  productionSpecification,
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  productionSpecification?: TabletThicknessSpecification;
  onClose?: () => void;
}) {
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const hasSpecificationFromOrder = hasTabletThicknessSpecification(
    productionSpecification,
  );
  const { data: fetchedProductionSpecification, isLoading } = useSWR(
    !hasSpecificationFromOrder && itemCodeValue
      ? `${API_ROUTES.productionSpecifications.base}/${itemCodeValue}`
      : null,
    () =>
      productionSpecificationsService.fetchProductionSpecificationByItemCode(
        itemCodeValue,
      ),
  );
  const specification = hasSpecificationFromOrder
    ? productionSpecification
    : fetchedProductionSpecification;
  const requirementValue = buildTabletThicknessRequirement(specification);
  const checksKey = productionOrderId
    ? API_ROUTES.productionOrders.tabletThicknessChecks(productionOrderId)
    : null;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(requirementValue),
  });

  useEffect(() => {
    form.setValue("requirement", requirementValue);
  }, [form, requirementValue]);

  const resetForm = () => form.reset(createDefaultValues(requirementValue));

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (isLoading) {
      toast.error("Đang tải specification của Item.");
      return;
    }

    const payload: CreateTabletThicknessCheckPayload = {
      requirement: values.requirement.trim() || null,
      dosage_form_stage: "tablet",
      unit: "mm",
      unit_1_thickness: normalizeDecimalText(values.unit_1_thickness),
    };

    OPTIONAL_TABLET_THICKNESS_KEYS.forEach((key) => {
      const value = values[key].trim();
      if (value) {
        payload[key] = normalizeDecimalText(value);
      }
    });

    try {
      await productionOrdersService.createTabletThicknessCheck(
        productionOrderId,
        payload,
      );
      toast.success("Đã lưu kiểm tra độ dày viên nén.");
      resetForm();
      await mutate(checksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu kiểm tra độ dày viên nén."),
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
              Kiểm tra độ dày viên nén
            </p>
            <FormField
              control={form.control}
              name="requirement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yêu cầu</FormLabel>
                  <FormControl>
                    <Textarea
                      readOnly
                      aria-readonly="true"
                      className="bg-gray-100 text-gray-700"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-4">
              {TABLET_THICKNESS_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Viên {index + 1} (mm)</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          disabled={form.formState.isSubmitting || isLoading}
                          {...field}
                        />
                      </FormControl>
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
            <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
              {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
