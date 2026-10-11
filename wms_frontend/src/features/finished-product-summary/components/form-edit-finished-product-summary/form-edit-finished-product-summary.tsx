"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
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
import productionOrdersService from "@/services/product-orders.service";

const nonNegativeIntegerText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldLabel} là bắt buộc`)
    .refine((value) => /^\d+$/.test(value), {
      message: `${fieldLabel} phải là số nguyên không âm`,
    });

const formSchema = z.object({
  package_count: nonNegativeIntegerText("Số kiện"),
  boxes_per_package: nonNegativeIntegerText("Số hộp trên kiện"),
  loose_box_count: nonNegativeIntegerText("Số hộp lẻ"),
  note: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
type SummaryValues = {
  package_count?: string | number | null;
  boxes_per_package?: string | number | null;
  loose_box_count?: string | number | null;
  note?: string | null;
};

const toTextValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "0" : String(value);

const toNonNegativeInteger = (value: string | undefined) =>
  value && /^\d+$/.test(value.trim()) ? Number(value) : 0;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormEditFinishedProductSummary({
  summaryId,
  data,
  onClose,
  onSaved,
}: {
  summaryId: string | number;
  data: SummaryValues;
  onClose?: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  const initialValues: FormValues = {
    package_count: toTextValue(data.package_count),
    boxes_per_package: toTextValue(data.boxes_per_package),
    loose_box_count: toTextValue(data.loose_box_count),
    note: data.note ?? "",
  };
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });
  const packageCount = useWatch({
    control: form.control,
    name: "package_count",
  });
  const boxesPerPackage = useWatch({
    control: form.control,
    name: "boxes_per_package",
  });
  const looseBoxCount = useWatch({
    control: form.control,
    name: "loose_box_count",
  });
  const totalQuantity =
    toNonNegativeInteger(packageCount) * toNonNegativeInteger(boxesPerPackage) +
    toNonNegativeInteger(looseBoxCount);

  const onSubmit = async (values: FormValues) => {
    const payload: {
      package_count?: number;
      boxes_per_package?: number;
      loose_box_count?: number;
      note?: string | null;
    } = {};
    const numberFields = [
      "package_count",
      "boxes_per_package",
      "loose_box_count",
    ] as const;

    numberFields.forEach((field) => {
      if (Number(values[field].trim()) !== Number(initialValues[field].trim())) {
        payload[field] = Number(values[field].trim());
      }
    });

    const note = values.note.trim() || null;
    const initialNote = initialValues.note.trim() || null;
    if (note !== initialNote) {
      payload.note = note;
    }

    if (Object.keys(payload).length === 0) {
      toast.error("Vui lòng thay đổi ít nhất một trường.");
      return;
    }

    try {
      await productionOrdersService.updateFinishedProductSummary(
        summaryId,
        payload,
      );
      toast.success("Đã cập nhật tổng kết thành phẩm.");
      await onSaved?.();
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật tổng kết thành phẩm."),
      );
    }
  };

  const fields: Array<{ name: keyof FormValues; label: string }> = [
    { name: "package_count", label: "Số kiện" },
    { name: "boxes_per_package", label: "Số hộp trên kiện" },
    { name: "loose_box_count", label: "Số hộp lẻ" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields.map(({ name, label }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <FormItem>
          <FormLabel>Tổng số lượng</FormLabel>
          <FormControl>
            <Input
              type="number"
              value={totalQuantity}
              readOnly
              className="bg-gray-100"
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
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
