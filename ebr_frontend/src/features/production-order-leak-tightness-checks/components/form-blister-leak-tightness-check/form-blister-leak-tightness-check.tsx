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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import productionSpecificationsService from "@/services/production-specifications.service";
import type { CreateLeakTightnessCheckPayload } from "../../types";
import {
  LEAK_TIGHTNESS_CHECK_KEYS,
  OPTIONAL_LEAK_TIGHTNESS_CHECK_KEYS,
  buildLeakTightnessRequirement,
  toResultValue,
  type ProductionSpecificationRequirement,
} from "../../utils";
import LeakTightnessResultToggle from "../leak-tightness-result-toggle/leak-tightness-result-toggle";

const requiredResult = z.enum(["pass", "fail"], {
  message: "Vui lòng chọn kết quả đơn vị 1",
});

const optionalResult = z.enum(["empty", "pass", "fail"]);

const formSchema = z.object({
  requirement: z.string().trim(),
  unit_1_result: requiredResult,
  unit_2_result: optionalResult,
  unit_3_result: optionalResult,
  unit_4_result: optionalResult,
  unit_5_result: optionalResult,
  unit_6_result: optionalResult,
  unit_7_result: optionalResult,
  unit_8_result: optionalResult,
  unit_9_result: optionalResult,
  unit_10_result: optionalResult,
});

type FormValues = z.infer<typeof formSchema>;

const createDefaultValues = (requirement = ""): FormValues => ({
  requirement,
  unit_1_result: undefined as unknown as FormValues["unit_1_result"],
  ...OPTIONAL_LEAK_TIGHTNESS_CHECK_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: "empty",
    }),
    {} as Omit<FormValues, "requirement" | "unit_1_result">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const buildBlisterRequirement = (baseRequirement: string) =>
  [
    "Tần suất kiểm tra: 30 phút/lần.",
    baseRequirement,
    "Đưa vỉ vào máy kiểm tra độ kín làm giảm áp suất xuống -60 kPa trong 2 phút, quan sát thấy không có bọt khí thoát ra khỏi vỉ.",
  ]
    .filter(Boolean)
    .join("\n");

export default function FormBlisterLeakTightnessCheck({
  productionOrderId,
  itemCode,
  productionSpecification,
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  productionSpecification?: ProductionSpecificationRequirement;
  onClose?: () => void;
}) {
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const { data: fetchedProductionSpecification } = useSWR(
    !productionSpecification && itemCodeValue
      ? `${API_ROUTES.productionSpecifications.base}/${itemCodeValue}`
      : null,
    () =>
      productionSpecificationsService.fetchProductionSpecificationByItemCode(
        itemCodeValue,
      ),
  );
  const requirementValue =
    buildBlisterRequirement(
      buildLeakTightnessRequirement(productionSpecification) ||
        buildLeakTightnessRequirement(fetchedProductionSpecification) ||
        "Không được rò rỉ",
    );
  const leakTightnessChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.leakTightnessChecks(productionOrderId)
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
    const payload: CreateLeakTightnessCheckPayload = {
      dosage_form_stage: "Vỉ",
      unit_1_result: toResultValue(values.unit_1_result) === true,
    };

    if (requirement) {
      payload.requirement = requirement;
    }

    OPTIONAL_LEAK_TIGHTNESS_CHECK_KEYS.forEach((key) => {
      const value = toResultValue(values[key]);

      if (value !== null) {
        payload[key] = value;
      }
    });

    try {
      await productionOrdersService.createLeakTightnessCheck(
        productionOrderId,
        payload,
      );

      toast.success("Đã lưu kiểm tra độ kín vỉ.");
      resetForm();
      await mutate(leakTightnessChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu kiểm tra độ kín vỉ."),
      );
      console.error("Error creating leak tightness check:", error);
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
              Kiểm tra độ kín vỉ
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
                        disabled={form.formState.isSubmitting}
                        className="bg-gray-100 text-gray-700"
                        placeholder="Không được rò rỉ"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-4">
              {LEAK_TIGHTNESS_CHECK_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>Đơn vị {index + 1}</FormLabel>
                        <LeakTightnessResultToggle
                          value={field.value}
                          disabled={form.formState.isSubmitting}
                          onChange={field.onChange}
                        />
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
