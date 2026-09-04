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
  ProductionOrderLeakTightnessCheck,
  UpdateLeakTightnessCheckPayload,
} from "../../types";
import {
  LEAK_TIGHTNESS_CHECK_KEYS,
  OPTIONAL_LEAK_TIGHTNESS_CHECK_KEYS,
  toFormResultValue,
  toResultValue,
} from "../../utils";
import LeakTightnessResultToggle from "../leak-tightness-result-toggle/leak-tightness-result-toggle";

const requiredResult = z.enum(["pass", "fail"], {
  message: "Vui lòng chọn kết quả đơn vị 1",
});

const optionalResult = z.enum(["empty", "pass", "fail"]);

const formSchema = z.object({
  requirement: z.string().trim(),
  dosage_form_stage: z.string().trim().max(50, {
    message: "Dạng bào chế tối đa 50 ký tự",
  }),
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

const toFormValues = (
  data: ProductionOrderLeakTightnessCheck,
): FormValues => ({
  requirement: data.requirement ?? "",
  dosage_form_stage: data.dosage_form_stage ?? "",
  unit_1_result: toFormResultValue(data.unit_1_result, "pass") as
    | "pass"
    | "fail",
  ...OPTIONAL_LEAK_TIGHTNESS_CHECK_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: toFormResultValue(data[key]),
    }),
    {} as Omit<FormValues, "requirement" | "dosage_form_stage" | "unit_1_result">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditLeakTightnessCheckForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderLeakTightnessCheck;
  onCancel: () => void;
  onSaved?: (data: ProductionOrderLeakTightnessCheck) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(data),
  });

  useEffect(() => {
    form.reset(toFormValues(data));
  }, [data, form]);

  const onSubmit = async (values: FormValues) => {
    if (data.id === null || data.id === undefined) {
      toast.error("Không tìm thấy bản ghi kiểm tra độ kín gói cốm.");
      return;
    }

    const payload: UpdateLeakTightnessCheckPayload = {
      requirement: values.requirement.trim() || null,
      dosage_form_stage: values.dosage_form_stage.trim() || null,
      unit_1_result: toResultValue(values.unit_1_result) === true,
    };

    OPTIONAL_LEAK_TIGHTNESS_CHECK_KEYS.forEach((key) => {
      payload[key] = toResultValue(values[key]);
    });

    try {
      const savedData = await productionOrdersService.updateLeakTightnessCheck(
        data.id,
        payload,
      );

      toast.success("Đã cập nhật kiểm tra độ kín gói cốm.");
      await mutate(API_ROUTES.productionOrders.leakTightnessCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.leakTightnessChecks(
            data.production_order_id,
          ),
        );
      }
      onSaved?.(savedData);
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật kiểm tra độ kín gói cốm."),
      );
      console.error("Error updating leak tightness check:", error);
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
              Cập nhật kiểm tra độ kín gói cốm
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

            <FormField
              control={form.control}
              name="dosage_form_stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dạng bào chế</FormLabel>
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      maxLength={50}
                      placeholder="tablet, capsule, film_coated_tablet"
                      {...field}
                    />
                  </FormControl>
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
