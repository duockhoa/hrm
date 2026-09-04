"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import useSWR from "swr";
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
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import { normalizeDecimalText } from "../../utils";
import type { ProductionOrderCylinderCalibration } from "../../types";

const decimalPattern = /^-?\d+(\.\d{1,4})?$/;

const isDecimal10Scale4 = (value: string) => {
  const normalized = normalizeDecimalText(value);

  if (!decimalPattern.test(normalized)) {
    return false;
  }

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) && Math.abs(numberValue) < 1000000;
};

const formSchema = z.object({
  cylinder_code: z
    .string()
    .trim()
    .max(100, "Mã ống đong tối đa 100 ký tự"),
  calibration_number: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập thông số hiệu chỉnh")
    .refine(isDecimal10Scale4, {
      message:
        "Thông số hiệu chỉnh phải đúng DECIMAL(10, 4), tối đa 4 chữ số sau dấu phẩy",
    }),
});

type FormValues = z.infer<typeof formSchema>;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const getDefaultValues = (
  data?: ProductionOrderCylinderCalibration | null,
): FormValues => ({
  cylinder_code: data?.cylinder_code ?? "",
  calibration_number:
    data?.calibration_number === null || data?.calibration_number === undefined
      ? ""
      : String(data.calibration_number).replace(".", ","),
});

export default function FormProductionOrderCylinderCalibration({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const calibrationKey = productionOrderId
    ? API_ROUTES.productionOrders.cylinderCalibration(productionOrderId)
    : null;

  const { data } = useSWR<ProductionOrderCylinderCalibration | null>(
    calibrationKey,
    () => productionOrdersService.fetchCylinderCalibration(productionOrderId),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (data !== undefined) {
      form.reset(getDefaultValues(data));
    }
  }, [data, form]);

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    try {
      const cylinderCode = values.cylinder_code.trim();

      if (data) {
        const calibrationNumber = normalizeDecimalText(
          values.calibration_number,
        );
        const previousCode = data.cylinder_code ?? "";
        const previousNumber =
          data.calibration_number === null ||
          data.calibration_number === undefined
            ? ""
            : normalizeDecimalText(String(data.calibration_number));
        const payload: {
          cylinder_code?: string;
          calibration_number?: string;
        } = {};

        if (cylinderCode !== previousCode) {
          payload.cylinder_code = cylinderCode;
        }
        if (calibrationNumber !== previousNumber) {
          payload.calibration_number = calibrationNumber;
        }
        if (Object.keys(payload).length === 0) {
          toast.info("Không có thay đổi để cập nhật.");
          return;
        }

        await productionOrdersService.updateCylinderCalibration(
          productionOrderId,
          payload,
        );
        toast.success("Đã cập nhật thông số hiệu chỉnh ống đong.");
        await mutate(calibrationKey);
        onClose?.();
        return;
      }

      await productionOrdersService.upsertCylinderCalibration(
        productionOrderId,
        {
          ...(cylinderCode ? { cylinder_code: cylinderCode } : {}),
          calibration_number: normalizeDecimalText(values.calibration_number),
        },
      );

      toast.success("Đã lưu thông số hiệu chỉnh ống đong.");
      await mutate(calibrationKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể lưu thông số hiệu chỉnh ống đong.",
        ),
      );
      console.error("Error saving cylinder calibration:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[260px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[228px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Thông số hiệu chỉnh ống đong
            </p>

            <FormField
              control={form.control}
              name="cylinder_code"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Mã ống đong (nếu có)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="OD-001"
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
              name="calibration_number"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Thông số hiệu chỉnh</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        placeholder="0,1234"
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => form.reset(getDefaultValues(data))}
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
