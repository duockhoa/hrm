"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { SamplingRecordPayload } from "../../types";
import {
  SAMPLING_TYPE_OPTIONS,
  SAMPLING_UNIT_OPTIONS,
  normalizeDecimalText,
} from "../../utils";

const decimalPattern = /^\d{1,10}([.,]\d{1,2})?$/;

const formSchema = z.object({
  sampling_type: z.string().trim().min(1, "Vui lòng chọn loại mẫu"),
  quantity: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số lượng")
    .refine((value) => decimalPattern.test(value), {
      message: "Số lượng tối đa 2 chữ số thập phân",
    })
    .refine((value) => Number(normalizeDecimalText(value)) > 0, {
      message: "Số lượng phải lớn hơn 0",
    }),
  unit: z.string().trim().min(1, "Vui lòng chọn đơn vị tính"),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  sampling_type: "",
  quantity: "",
  unit: "",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderSamplingRecord({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const samplingRecordsKey = productionOrderId
    ? API_ROUTES.productionOrders.samplingRecords(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const resetForm = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const payload: SamplingRecordPayload = {
      sampling_type: values.sampling_type,
      quantity: normalizeDecimalText(values.quantity),
      unit: values.unit,
    };

    try {
      await productionOrdersService.createSamplingRecord(
        productionOrderId,
        payload,
      );

      toast.success("Đã lưu dữ liệu lấy mẫu.");
      resetForm();
      await mutate(samplingRecordsKey);
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể lưu dữ liệu lấy mẫu."));
      console.error("Error creating sampling record:", error);
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
              Lấy mẫu
            </p>

            <FormField
              control={form.control}
              name="sampling_type"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Loại mẫu</FormLabel>
                    <Select
                      value={field.value}
                      disabled={form.formState.isSubmitting}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn loại mẫu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SAMPLING_TYPE_OPTIONS.map((option) => (
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
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Số lượng</FormLabel>
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

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Đơn vị tính</FormLabel>
                    <Select
                      value={field.value}
                      disabled={form.formState.isSubmitting}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn đơn vị tính" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SAMPLING_UNIT_OPTIONS.map((option) => (
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
