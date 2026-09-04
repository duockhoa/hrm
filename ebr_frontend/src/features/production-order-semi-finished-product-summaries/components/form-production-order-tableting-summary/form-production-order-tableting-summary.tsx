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
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderSemiFinishedProductSummary } from "../../types";

const optionalDecimal = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        /^\d{1,9}([.,]\d{1,3})?$/.test(value),
      {
        message: `${label} phải là số không âm, tối đa 3 chữ số thập phân`,
      },
    );

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} tối đa ${max} ký tự`);

const formSchema = z.object({
  stage: optionalText("Giai đoạn", 100),
  input_quantity: optionalDecimal("Lượng đầu vào"),
  load_quantity: optionalDecimal("Số tải bán thành phẩm"),
  packed_quantity: optionalDecimal("Lượng đã đóng"),
  leftover_quantity: optionalDecimal("Lượng còn lại"),
  waste_quantity: optionalDecimal("Lượng hao hụt"),
});

type FormValues = z.infer<typeof formSchema>;

const toFormText = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const emptyValues = (
  stage = "",
  data?: ProductionOrderSemiFinishedProductSummary | null,
): FormValues => ({
  stage: toFormText(data?.stage) || stage,
  input_quantity: toFormText(data?.input_quantity),
  load_quantity: toFormText(data?.load_quantity),
  packed_quantity: toFormText(data?.packed_quantity),
  leftover_quantity: toFormText(data?.leftover_quantity),
  waste_quantity: toFormText(data?.waste_quantity),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export default function FormProductionOrderTabletingSummary({
  productionOrderId,
  stage = "Dập viên",
  title = "Tổng kết dập viên",
  inputQuantityLabel = "Khối lượng cốm ban đầu",
  inputQuantityUnit = "kg",
  packedQuantityLabel = "Khối lượng viên đóng được",
  packedQuantityUnit = "kg",
  leftoverQuantityLabel = "Khối lượng cốm dư",
  leftoverQuantityUnit = "kg",
  wasteQuantityLabel = "Khối lượng cốm hỏng",
  wasteQuantityUnit = "kg",
  loadQuantityLabel = "Số tải bán thành phẩm",
  loadQuantityUnit = "tải",
  showLoadQuantity = true,
  data,
  onClose,
  onSaved,
}: {
  productionOrderId: string | number;
  stage?: string;
  title?: string;
  inputQuantityLabel?: string;
  inputQuantityUnit?: string;
  packedQuantityLabel?: string;
  packedQuantityUnit?: string;
  leftoverQuantityLabel?: string;
  leftoverQuantityUnit?: string;
  wasteQuantityLabel?: string;
  wasteQuantityUnit?: string;
  loadQuantityLabel?: string;
  loadQuantityUnit?: string;
  showLoadQuantity?: boolean;
  data?: ProductionOrderSemiFinishedProductSummary | null;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const summaryId = data?.id;
  const summariesKey = productionOrderId
    ? API_ROUTES.productionOrders.semiFinishedProductSummaries(
        productionOrderId,
      )
    : null;
  const detailKey = summaryId
    ? API_ROUTES.productionOrders.semiFinishedProductSummaryDetail(summaryId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(stage, data),
  });

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    try {
      const payload = {
        stage: toNullable(values.stage),
        input_quantity: toNullable(values.input_quantity),
        input_unit: inputQuantityUnit,
        load_quantity: toNullable(values.load_quantity),
        load_unit: loadQuantityUnit,
        packed_quantity: toNullable(values.packed_quantity),
        packed_unit: packedQuantityUnit,
        leftover_quantity: toNullable(values.leftover_quantity),
        leftover_unit: leftoverQuantityUnit,
        waste_quantity: toNullable(values.waste_quantity),
        waste_unit: wasteQuantityUnit,
      };

      if (summaryId) {
        await productionOrdersService.updateSemiFinishedProductSummary(
          summaryId,
          payload,
        );
      } else {
        await productionOrdersService.createSemiFinishedProductSummary(
          productionOrderId,
          payload,
        );
      }

      toast.success(`Đã lưu ${title.toLocaleLowerCase("vi-VN")}.`);
      form.reset(emptyValues(stage, summaryId ? data : null));
      if (summariesKey) {
        await mutate(summariesKey);
      }
      if (detailKey) {
        await mutate(detailKey);
      }
      onSaved?.();
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, `Không thể lưu ${title.toLocaleLowerCase("vi-VN")}.`));
    }
  };

  const quantityFields: Array<{
    quantity: keyof FormValues;
    label: string;
    unit: string;
  }> = [
    {
      quantity: "input_quantity",
      label: inputQuantityLabel,
      unit: inputQuantityUnit,
    },
    {
      quantity: "packed_quantity",
      label: packedQuantityLabel,
      unit: packedQuantityUnit,
    },
    {
      quantity: "leftover_quantity",
      label: leftoverQuantityLabel,
      unit: leftoverQuantityUnit,
    },
    {
      quantity: "waste_quantity",
      label: wasteQuantityLabel,
      unit: wasteQuantityUnit,
    },
    ...(showLoadQuantity
      ? [
          {
            quantity: "load_quantity" as const,
            label: loadQuantityLabel,
            unit: loadQuantityUnit,
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            {title}
          </p>

          <FormField
            control={form.control}
            name="stage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giai đoạn</FormLabel>
                <FormControl>
                  <Input
                    readOnly
                    disabled={form.formState.isSubmitting}
                    maxLength={100}
                    className="bg-gray-100"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {quantityFields.map((item) => (
            <div key={item.quantity}>
              <FormField
                control={form.control}
                name={item.quantity}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {item.label} ({item.unit})
                    </FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        disabled={form.formState.isSubmitting}
                        placeholder="0,000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => form.reset(emptyValues(stage, data))}
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
