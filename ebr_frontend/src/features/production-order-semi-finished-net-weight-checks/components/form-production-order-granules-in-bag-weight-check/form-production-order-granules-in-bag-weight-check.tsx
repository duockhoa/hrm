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
import type { CreateSemiFinishedNetWeightCheckPayload } from "../../types";
import {
  OPTIONAL_SEMI_FINISHED_NET_WEIGHT_KEYS,
  SEMI_FINISHED_NET_WEIGHT_KEYS,
  buildGranulesInBagNetWeightRequirement,
  hasProductionSpecificationLimits,
  normalizeDecimalText,
  toNumber,
  type ProductionSpecificationLimits,
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
  unit_1_net_weight: requiredWeightText("khối lượng đơn vị 1"),
  unit_2_net_weight: optionalWeightText("khối lượng đơn vị 2"),
  unit_3_net_weight: optionalWeightText("khối lượng đơn vị 3"),
  unit_4_net_weight: optionalWeightText("khối lượng đơn vị 4"),
  unit_5_net_weight: optionalWeightText("khối lượng đơn vị 5"),
  unit_6_net_weight: optionalWeightText("khối lượng đơn vị 6"),
  unit_7_net_weight: optionalWeightText("khối lượng đơn vị 7"),
  unit_8_net_weight: optionalWeightText("khối lượng đơn vị 8"),
  unit_9_net_weight: optionalWeightText("khối lượng đơn vị 9"),
  unit_10_net_weight: optionalWeightText("khối lượng đơn vị 10"),
});

type FormValues = z.infer<typeof formSchema>;

const createDefaultValues = (requirement = ""): FormValues => ({
  requirement,
  ...SEMI_FINISHED_NET_WEIGHT_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: "",
    }),
    {} as Omit<FormValues, "requirement">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderGranulesInBagWeightCheck({
  productionOrderId,
  itemCode,
  productionSpecification,
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  productionSpecification?: ProductionSpecificationLimits;
  onClose?: () => void;
}) {
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const hasProductionSpecificationFromOrder =
    hasProductionSpecificationLimits(productionSpecification);
  const { data: fetchedProductionSpecification } = useSWR(
    !hasProductionSpecificationFromOrder && itemCodeValue
      ? `${API_ROUTES.productionSpecifications.base}/${itemCodeValue}`
      : null,
    () =>
      productionSpecificationsService.fetchProductionSpecificationByItemCode(
        itemCodeValue,
      ),
  );
  const requirementValue =
    buildGranulesInBagNetWeightRequirement(productionSpecification) ||
    buildGranulesInBagNetWeightRequirement(fetchedProductionSpecification);
  const semiFinishedNetWeightChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.semiFinishedNetWeightChecks(
        productionOrderId,
      )
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
    const payload: CreateSemiFinishedNetWeightCheckPayload = {
      dosage_form_stage: "Cốm trong gói",
      unit: "g",
      unit_1_net_weight: normalizeDecimalText(values.unit_1_net_weight),
    };

    if (requirement) {
      payload.requirement = requirement;
    }

    OPTIONAL_SEMI_FINISHED_NET_WEIGHT_KEYS.forEach((key) => {
      const value = values[key].trim();

      if (value) {
        payload[key] = normalizeDecimalText(value);
      }
    });

    try {
      await productionOrdersService.createSemiFinishedNetWeightCheck(
        productionOrderId,
        payload,
      );

      toast.success("Đã lưu kiểm tra khối lượng tịnh.");
      resetForm();
      await mutate(semiFinishedNetWeightChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu kiểm tra khối lượng tịnh."),
      );
      console.error("Error creating semi-finished net weight check:", error);
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
              Kiểm tra khối lượng tịnh
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
              {SEMI_FINISHED_NET_WEIGHT_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>Túi {index + 1}</FormLabel>
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
