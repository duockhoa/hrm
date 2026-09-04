"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import type { ProductionOrderMaterialProcessSummary } from "../../types";

const decimalPattern = /^\d{1,9}([.,]\d{1,3})?$/;
const moisturePattern = /^\d{1,3}([.,]\d{1,2})?$/;

const formSchema = z.object({
  yielded_quantity: z
    .string()
    .trim()
    .refine((value) => decimalPattern.test(value), {
      message: "Khối lượng phải là số không âm, tối đa 3 chữ số thập phân.",
    }),
  moisture_percent: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (moisturePattern.test(value) && Number(value.replace(",", ".")) <= 100),
      {
        message: "Hàm ẩm phải từ 0 đến 100, tối đa 2 chữ số thập phân.",
      },
    ),
  note: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const emptyValues = (
  data?: ProductionOrderMaterialProcessSummary | null,
): FormValues => ({
  yielded_quantity:
    data?.yielded_quantity === null || data?.yielded_quantity === undefined
      ? ""
      : String(data.yielded_quantity),
  moisture_percent:
    data?.moisture_percent === null || data?.moisture_percent === undefined
      ? ""
      : String(data.moisture_percent),
  note: data?.note ?? "",
});

const defaultValues: FormValues = {
  yielded_quantity: "",
  moisture_percent: "",
  note: "",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { message?: string } } })
    ?.response;
  return response?.data?.message ?? (error as Error)?.message ?? fallback;
};

const getSummaryTitle = (processStage: string) =>
  processStage === "Sản xuất bột dược liệu"
    ? "Tổng kết bột dược liệu"
    : `Tổng kết ${processStage.toLocaleLowerCase("vi-VN")}`;

export default function FormProductionOrderExtractionSummary({
  productionOrderId,
  data,
  onClose,
  onSaved,
  processStage = "Chiết cao",
}: {
  productionOrderId: string | number;
  data?: ProductionOrderMaterialProcessSummary | null;
  onClose?: () => void;
  onSaved?: () => void;
  processStage?: string;
}) {
  const summaryId = data?.id;
  const selectedProcessStage = data?.process_stage ?? processStage;
  const summaryTitle = getSummaryTitle(selectedProcessStage);
  const [image, setImage] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(data),
  });

  const resetForm = () => {
    form.reset(summaryId ? emptyValues(data) : defaultValues);
    setImage(null);
    setImageInputKey((key) => key + 1);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
          process_stage: selectedProcessStage,
          yielded_quantity: values.yielded_quantity,
          yielded_unit: "kg",
          moisture_percent: values.moisture_percent || null,
          note: values.note || null,
          image,
      };

      if (summaryId !== null && summaryId !== undefined) {
        await productionOrdersService.updateMaterialProcessSummary(
          summaryId,
          payload,
        );
      } else {
        await productionOrdersService.createMaterialProcessSummary(
          productionOrderId,
          payload,
        );
      }

      await mutate(
        API_ROUTES.productionOrders.materialProcessSummaries(productionOrderId),
      );
      if (summaryId !== null && summaryId !== undefined) {
        await mutate(
          API_ROUTES.productionOrders.materialProcessSummaryDetail(summaryId),
        );
      }
      toast.success(
        summaryId !== null && summaryId !== undefined
          ? `Đã cập nhật ${summaryTitle.toLocaleLowerCase("vi-VN")}.`
          : `Đã lưu ${summaryTitle.toLocaleLowerCase("vi-VN")}.`,
      );
      resetForm();
      onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          summaryId !== null && summaryId !== undefined
            ? `Không thể cập nhật ${summaryTitle.toLocaleLowerCase("vi-VN")}.`
            : `Không thể lưu ${summaryTitle.toLocaleLowerCase("vi-VN")}.`,
        ),
      );
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            {summaryTitle}
          </p>

          <FormItem>
            <FormLabel>Giai đoạn</FormLabel>
            <FormControl>
              <Input
                readOnly
                value={selectedProcessStage}
                className="bg-gray-100"
              />
            </FormControl>
          </FormItem>

          <FormField
            control={form.control}
            name="yielded_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Khối lượng thu được (kg)</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="0,000"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="moisture_percent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hàm ẩm (%)</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="Ví dụ: 4,25"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Ảnh</FormLabel>
            <FormControl>
              <Input
                key={imageInputKey}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={form.formState.isSubmitting}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;

                  if (
                    file &&
                    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
                      file.type,
                    )
                  ) {
                    toast.error("Ảnh phải có định dạng JPG, PNG, WEBP hoặc GIF.");
                    event.target.value = "";
                    setImage(null);
                    return;
                  }
                  if (file && file.size > 20 * 1024 * 1024) {
                    toast.error("Ảnh không được vượt quá 20 MB.");
                    event.target.value = "";
                    setImage(null);
                    return;
                  }

                  setImage(file);
                }}
              />
            </FormControl>
          </FormItem>

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ghi chú</FormLabel>
                <FormControl>
                  <Textarea disabled={form.formState.isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
