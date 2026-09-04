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
import type { ProductionOrderShellWeightCheck } from "@/features/production-order-shell-weight-checks/types";
import { API_ROUTES } from "@/lib/api-routes";
import itemsService from "@/services/items.service";
import productionOrdersService from "@/services/product-orders.service";
import type { CreateSemiFinishedGrossWeightCheckPayload } from "../../types";
import {
  OPTIONAL_SEMI_FINISHED_GROSS_WEIGHT_KEYS,
  SEMI_FINISHED_GROSS_WEIGHT_KEYS,
  buildSemiFinishedSolutionPackageGrossWeightRequirement,
  formatDosageFormStage,
  getLatestCompleteShellWeightAverageGram,
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
  unit_1_gross_weight: requiredWeightText("khối lượng gói dịch 1"),
  unit_2_gross_weight: optionalWeightText("khối lượng gói dịch 2"),
  unit_3_gross_weight: optionalWeightText("khối lượng gói dịch 3"),
  unit_4_gross_weight: optionalWeightText("khối lượng gói dịch 4"),
  unit_5_gross_weight: optionalWeightText("khối lượng gói dịch 5"),
  unit_6_gross_weight: optionalWeightText("khối lượng gói dịch 6"),
  unit_7_gross_weight: optionalWeightText("khối lượng gói dịch 7"),
  unit_8_gross_weight: optionalWeightText("khối lượng gói dịch 8"),
  unit_9_gross_weight: optionalWeightText("khối lượng gói dịch 9"),
  unit_10_gross_weight: optionalWeightText("khối lượng gói dịch 10"),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  requirement: "",
  ...SEMI_FINISHED_GROSS_WEIGHT_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: "",
    }),
    {} as Omit<FormValues, "requirement">,
  ),
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderSolutionPackageWeightCheck({
  productionOrderId,
  itemCode,
  containerType = "package",
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  containerType?: "package" | "tube";
  onClose?: () => void;
}) {
  const isTubeWeightCheck = containerType === "tube";
  const dosageFormStage = isTubeWeightCheck ? "Tuýp" : "Gói dịch";
  const containerLabel = isTubeWeightCheck ? "tuýp" : "gói dịch";
  const containerLabelTitle = isTubeWeightCheck ? "Tuýp" : "Gói dịch";
  const title = `Kiểm tra khối lượng ${containerLabel}`;
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const { data: item } = useSWR(
    itemCodeValue
      ? `${API_ROUTES.items.base}/${encodeURIComponent(itemCodeValue)}`
      : null,
    () => itemsService.fetchItemById(itemCodeValue),
  );
  const { data: shellWeightChecks } = useSWR<ProductionOrderShellWeightCheck[]>(
    productionOrderId
      ? API_ROUTES.productionOrders.shellWeightChecks(productionOrderId)
      : null,
    () => productionOrdersService.fetchShellWeightChecks(productionOrderId),
  );
  const { data: densityChecks } = useSWR(
    productionOrderId
      ? API_ROUTES.productionOrders.densityChecks(productionOrderId)
      : null,
    () => productionOrdersService.fetchDensityChecks(productionOrderId),
  );
  const latestShellWeightAverageGram =
    getLatestCompleteShellWeightAverageGram(shellWeightChecks);
  const latestDensity = getLatestDensityValue(densityChecks);
  const requirementValue =
    buildSemiFinishedSolutionPackageGrossWeightRequirement(
      item?.productionSpecification ?? item,
      latestShellWeightAverageGram,
      latestDensity,
      containerLabel,
    );
  const semiFinishedGrossWeightChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.semiFinishedGrossWeightChecks(
        productionOrderId,
      )
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      requirement: requirementValue,
    },
  });

  useEffect(() => {
    form.setValue("requirement", requirementValue);
  }, [form, requirementValue]);

  const resetForm = () => {
    form.reset({
      ...defaultValues,
      requirement: requirementValue,
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (latestShellWeightAverageGram === null) {
      toast.error("Vui lòng lưu đủ khối lượng bao bì 1 đến 10 trước.");
      return;
    }

    if (!requirementValue) {
      toast.error(`Không thể tính yêu cầu ${title.toLocaleLowerCase("vi-VN")} từ dữ liệu hiện có.`);
      return;
    }

    const requirement = values.requirement.trim();
    const payload: CreateSemiFinishedGrossWeightCheckPayload = {
      dosage_form_stage: dosageFormStage,
      unit: "g",
      unit_1_gross_weight: normalizeDecimalText(values.unit_1_gross_weight),
    };

    if (requirement) {
      payload.requirement = requirement;
    }

    OPTIONAL_SEMI_FINISHED_GROSS_WEIGHT_KEYS.forEach((key) => {
      const value = values[key].trim();

      if (value) {
        payload[key] = normalizeDecimalText(value);
      }
    });

    try {
      await productionOrdersService.createSemiFinishedGrossWeightCheck(
        productionOrderId,
        payload,
      );

      toast.success(`Đã lưu ${title.toLocaleLowerCase("vi-VN")}.`);
      resetForm();
      await mutate(semiFinishedGrossWeightChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, `Không thể lưu ${title.toLocaleLowerCase("vi-VN")}.`),
      );
      console.error(
        `Error creating ${containerLabel} gross weight check:`,
        error,
      );
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Dạng bào chế
              </label>
              <Input
                readOnly
                aria-readonly="true"
                value={formatDosageFormStage(dosageFormStage)}
                className="bg-gray-100 text-gray-700"
              />
            </div>

            <div className="flex flex-col gap-4">
              {SEMI_FINISHED_GROSS_WEIGHT_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>{containerLabelTitle} {index + 1} (g)</FormLabel>
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
