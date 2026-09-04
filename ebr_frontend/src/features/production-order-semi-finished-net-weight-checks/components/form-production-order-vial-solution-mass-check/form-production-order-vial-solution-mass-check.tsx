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
import type { CreateSemiFinishedGrossWeightCheckPayload } from "@/features/production-order-semi-finished-gross-weight-checks/types";
import {
  OPTIONAL_SEMI_FINISHED_GROSS_WEIGHT_KEYS,
} from "@/features/production-order-semi-finished-gross-weight-checks/utils";
import { API_ROUTES } from "@/lib/api-routes";
import itemsService from "@/services/items.service";
import productionOrdersService from "@/services/product-orders.service";
import type { CreateSemiFinishedNetWeightCheckPayload } from "../../types";
import {
  OPTIONAL_SEMI_FINISHED_NET_WEIGHT_KEYS,
  SEMI_FINISHED_NET_WEIGHT_KEYS,
  buildTubeSolutionMassRequirement,
  buildVialSolutionMassRequirement,
  buildVialWeightRequirement,
  getAverageShellWeight,
  getLatestDensityValue,
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
  unit_1_net_weight: requiredWeightText("khối lượng lọ 1"),
  unit_2_net_weight: optionalWeightText("khối lượng lọ 2"),
  unit_3_net_weight: optionalWeightText("khối lượng lọ 3"),
  unit_4_net_weight: optionalWeightText("khối lượng lọ 4"),
  unit_5_net_weight: optionalWeightText("khối lượng lọ 5"),
  unit_6_net_weight: optionalWeightText("khối lượng lọ 6"),
  unit_7_net_weight: optionalWeightText("khối lượng lọ 7"),
  unit_8_net_weight: optionalWeightText("khối lượng lọ 8"),
  unit_9_net_weight: optionalWeightText("khối lượng lọ 9"),
  unit_10_net_weight: optionalWeightText("khối lượng lọ 10"),
});

type FormValues = z.infer<typeof formSchema>;

const createDefaultValues = (requirement = ""): FormValues => ({
  requirement,
  ...SEMI_FINISHED_NET_WEIGHT_KEYS.reduce(
    (values, key) => ({ ...values, [key]: "" }),
    {} as Omit<FormValues, "requirement">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderVialSolutionMassCheck({
  productionOrderId,
  itemCode,
  checkType = "solution",
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  checkType?: "vial" | "solution" | "tube";
  onClose?: () => void;
}) {
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const isVialWeightCheck = checkType === "vial";
  const title = isVialWeightCheck
    ? "Kiểm tra khối lượng lọ"
    : checkType === "tube"
      ? "Kiểm tra khối lượng dịch trong tuýp"
      : "Kiểm tra khối lượng dịch trong lọ";
  const { data: densityChecks } = useSWR(
    productionOrderId
      ? API_ROUTES.productionOrders.densityChecks(productionOrderId)
      : null,
    () => productionOrdersService.fetchDensityChecks(productionOrderId),
  );
  const { data: item } = useSWR(
    itemCodeValue
      ? `${API_ROUTES.items.base}/${encodeURIComponent(itemCodeValue)}`
      : null,
    () => itemsService.fetchItemById(itemCodeValue),
  );
  const { data: shellWeightChecks } = useSWR(
    isVialWeightCheck && productionOrderId
      ? API_ROUTES.productionOrders.shellWeightChecks(productionOrderId)
      : null,
    () => productionOrdersService.fetchShellWeightChecks(productionOrderId),
  );
  const density = getLatestDensityValue(densityChecks);
  const averageShellWeight = getAverageShellWeight(shellWeightChecks);
  const requirementValue = isVialWeightCheck
    ? buildVialWeightRequirement(
        item?.productionSpecification ?? item,
        density,
        averageShellWeight,
      )
    : checkType === "tube"
      ? buildTubeSolutionMassRequirement(
          item?.productionSpecification ?? item,
          density,
        )
      : buildVialSolutionMassRequirement(
          item?.productionSpecification ?? item,
          density,
        );
  const weightChecksKey = productionOrderId
    ? isVialWeightCheck
      ? API_ROUTES.productionOrders.semiFinishedGrossWeightChecks(
          productionOrderId,
        )
      : API_ROUTES.productionOrders.semiFinishedNetWeightChecks(
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

  const resetForm = () => form.reset(createDefaultValues(requirementValue));

  const onSubmit = async (values: FormValues) => {
    if (isVialWeightCheck && averageShellWeight === null) {
      toast.error("Vui lòng lưu đủ khối lượng bao bì 1 đến 10 trước.");
      return;
    }

    if (!requirementValue) {
      toast.error(`Không thể tính yêu cầu ${title.toLocaleLowerCase("vi-VN")}.`);
      return;
    }

    const requirement = values.requirement.trim();

    try {
      if (isVialWeightCheck) {
        const payload: CreateSemiFinishedGrossWeightCheckPayload = {
          dosage_form_stage: "Lọ",
          unit: "g",
          unit_1_gross_weight: normalizeDecimalText(values.unit_1_net_weight),
        };

        if (requirement) {
          payload.requirement = requirement;
        }

        OPTIONAL_SEMI_FINISHED_NET_WEIGHT_KEYS.forEach((key, index) => {
          const value = values[key].trim();

          if (value) {
            payload[OPTIONAL_SEMI_FINISHED_GROSS_WEIGHT_KEYS[index]] =
              normalizeDecimalText(value);
          }
        });

        await productionOrdersService.createSemiFinishedGrossWeightCheck(
          productionOrderId,
          payload,
        );
      } else {
        const payload: CreateSemiFinishedNetWeightCheckPayload = {
          dosage_form_stage: checkType === "tube" ? "Tuýp" : "Lọ dịch",
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

        await productionOrdersService.createSemiFinishedNetWeightCheck(
          productionOrderId,
          payload,
        );
      }

      toast.success(`Đã lưu ${title.toLocaleLowerCase("vi-VN")}.`);
      resetForm();
      await mutate(weightChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, `Không thể lưu ${title.toLocaleLowerCase("vi-VN")}.`),
      );
      console.error("Error creating vial mass check:", error);
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
                        <FormLabel>
                          {checkType === "tube" ? "Tuýp" : "Lọ"} {index + 1} (g)
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
