"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type {
  HardCapsuleLeakageCheckPayload,
  ProductionOrderHardCapsuleLeakageCheck,
} from "../../types";
import {
  HARD_CAPSULE_LEAKAGE_STAGE_OPTIONS,
  formatLeakageRate,
} from "../../utils";

const integerText = (fieldLabel: string, minValue: number) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${fieldLabel}`)
    .refine((value) => Number.isInteger(Number(value)), {
      message: `${fieldLabel} phải là số nguyên`,
    })
    .refine((value) => Number(value) >= minValue, {
      message: `${fieldLabel} phải lớn hơn hoặc bằng ${minValue}`,
    });

const formSchema = z
  .object({
    stage: z.enum(["before_coating", "after_coating"], {
      message: "Vui lòng chọn công đoạn kiểm tra",
    }),
    tested_capsule_count: integerText("số viên nang cứng kiểm tra", 1),
    leaked_capsule_count: integerText("số viên nang cứng bị rò rỉ", 0),
  })
  .refine(
    (values) =>
      Number(values.leaked_capsule_count) <=
      Number(values.tested_capsule_count),
    {
      message: "Số viên rò rỉ không được vượt số viên kiểm tra",
      path: ["leaked_capsule_count"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const toText = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const toFormValues = (
  data: ProductionOrderHardCapsuleLeakageCheck,
): FormValues => ({
  stage:
    data.stage === "before_coating" || data.stage === "after_coating"
      ? data.stage
      : "before_coating",
  tested_capsule_count: toText(data.tested_capsule_count),
  leaked_capsule_count: toText(data.leaked_capsule_count),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditHardCapsuleLeakageCheckForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderHardCapsuleLeakageCheck;
  onCancel: () => void;
  onSaved?: (data: ProductionOrderHardCapsuleLeakageCheck) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(data),
  });
  const testedCapsuleCount = useWatch({
    control: form.control,
    name: "tested_capsule_count",
  });
  const leakedCapsuleCount = useWatch({
    control: form.control,
    name: "leaked_capsule_count",
  });
  const leakageRate = formatLeakageRate(
    testedCapsuleCount,
    leakedCapsuleCount,
  );

  const onSubmit = async (values: FormValues) => {
    if (data.id === null || data.id === undefined) {
      toast.error("Không tìm thấy bản ghi kiểm tra độ rò rỉ viên nang cứng.");
      return;
    }

    const payload: HardCapsuleLeakageCheckPayload = {
      stage: values.stage,
      tested_capsule_count: Number(values.tested_capsule_count),
      leaked_capsule_count: Number(values.leaked_capsule_count),
    };

    try {
      const savedData =
        await productionOrdersService.updateHardCapsuleLeakageCheck(
          data.id,
          payload,
        );

      toast.success("Đã cập nhật kiểm tra độ rò rỉ viên nang cứng.");
      await mutate(
        API_ROUTES.productionOrders.hardCapsuleLeakageCheckDetail(data.id),
      );
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.hardCapsuleLeakageChecks(
            data.production_order_id,
          ),
        );
      }
      onSaved?.(savedData);
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể cập nhật kiểm tra độ rò rỉ viên nang cứng.",
        ),
      );
      console.error("Error updating hard capsule leakage check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[360px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[328px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Cập nhật kiểm tra độ rò rỉ viên nang cứng
            </p>

            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Công đoạn kiểm tra</FormLabel>
                    <Select
                      value={field.value}
                      disabled={form.formState.isSubmitting}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn công đoạn" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HARD_CAPSULE_LEAKAGE_STAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tested_capsule_count"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Số viên nang cứng kiểm tra</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
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

            <FormField
              control={form.control}
              name="leaked_capsule_count"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Số viên nang cứng bị rò rỉ</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
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

            <div className="space-y-2">
              <FormLabel>Tỉ lệ rò rỉ</FormLabel>
              <Input
                readOnly
                tabIndex={-1}
                value={leakageRate}
                className="bg-gray-50 font-semibold text-gray-900"
              />
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
