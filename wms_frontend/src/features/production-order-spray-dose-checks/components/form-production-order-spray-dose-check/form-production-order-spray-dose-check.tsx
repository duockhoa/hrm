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
import type { SprayDoseCheckPayload } from "../../types";
import {
  buildSprayDoseRequirement,
  OPTIONAL_SPRAY_DOSE_KEYS,
  SPRAY_DOSE_KEYS,
  type SprayDoseSpecificationLimits,
} from "../../utils";

const positiveIntegerText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, { message: `${fieldLabel} is required` })
    .regex(/^\d+$/, { message: `${fieldLabel} must be a positive integer` })
    .refine((value) => Number(value) > 0, {
      message: `${fieldLabel} must be a positive integer`,
    });

const optionalPositiveIntegerText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || /^\d+$/.test(value), {
      message: `${fieldLabel} must be a positive integer`,
    })
    .refine((value) => !value || Number(value) > 0, {
      message: `${fieldLabel} must be a positive integer`,
    });

const formSchema = z.object({
  requirement: z.string().trim(),
  bottle_1_spray_dose_count: positiveIntegerText("bottle_1_spray_dose_count"),
  bottle_2_spray_dose_count: optionalPositiveIntegerText("bottle_2_spray_dose_count"),
  bottle_3_spray_dose_count: optionalPositiveIntegerText("bottle_3_spray_dose_count"),
  bottle_4_spray_dose_count: optionalPositiveIntegerText("bottle_4_spray_dose_count"),
  bottle_5_spray_dose_count: optionalPositiveIntegerText("bottle_5_spray_dose_count"),
  bottle_6_spray_dose_count: optionalPositiveIntegerText("bottle_6_spray_dose_count"),
});

type FormValues = z.infer<typeof formSchema>;

const createDefaultValues = (requirement = ""): FormValues => ({
  requirement,
  ...SPRAY_DOSE_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: "",
    }),
    {} as Omit<FormValues, "requirement">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderSprayDoseCheck({
  productionOrderId,
  itemCode,
  productionSpecification,
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  productionSpecification?: SprayDoseSpecificationLimits;
  onClose?: () => void;
}) {
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const orderRequirementValue = buildSprayDoseRequirement(
    productionSpecification,
  );
  const { data: fetchedProductionSpecification } = useSWR(
    !orderRequirementValue && itemCodeValue
      ? `${API_ROUTES.productionSpecifications.base}/${itemCodeValue}`
      : null,
    () =>
      productionSpecificationsService.fetchProductionSpecificationByItemCode(
        itemCodeValue,
      ),
  );
  const requirementValue =
    orderRequirementValue ||
    buildSprayDoseRequirement(fetchedProductionSpecification);
  const sprayDoseChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.sprayDoseChecks(productionOrderId)
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

    const payload: SprayDoseCheckPayload = {
      unit: "liều",
      bottle_1_spray_dose_count: values.bottle_1_spray_dose_count.trim(),
    };
    const requirement = values.requirement.trim();

    if (requirement) {
      payload.requirement = requirement;
    }

    OPTIONAL_SPRAY_DOSE_KEYS.forEach((key) => {
      const value = values[key].trim();

      if (value) {
        payload[key] = value;
      }
    });

    try {
      await productionOrdersService.createSprayDoseCheck(
        productionOrderId,
        payload,
      );

      toast.success("Đã lưu kiểm tra số lượng liều xịt.");
      resetForm();
      await mutate(sprayDoseChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu kiểm tra số lượng liều xịt."),
      );
      console.error("Error creating spray dose check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[520px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[488px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Kiểm tra số lượng liều xịt
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
              {SPRAY_DOSE_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>Lọ {index + 1} (liều)</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
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
