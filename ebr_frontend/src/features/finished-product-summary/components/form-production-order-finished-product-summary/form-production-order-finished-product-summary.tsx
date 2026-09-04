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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
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

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const toNonNegativeInteger = (value: string | undefined) =>
  value && /^\d+$/.test(value.trim()) ? Number(value) : 0;

export default function FormProductionOrderFinishedProductSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const finishedProductSummaryKey = productionOrderId
    ? API_ROUTES.productionOrders.finishedProductSummary(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      package_count: "",
      boxes_per_package: "",
      loose_box_count: "",
      note: "",
    },
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
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    try {
      await productionOrdersService.createFinishedProductSummary(
        productionOrderId,
        {
          package_count: values.package_count.trim(),
          boxes_per_package: values.boxes_per_package.trim(),
          loose_box_count: values.loose_box_count.trim(),
          note: values.note.trim() || null,
        },
      );

      toast.success("Đã lưu tổng kết thành phẩm.");
      form.reset({
        package_count: "",
        boxes_per_package: "",
        loose_box_count: "",
        note: "",
      });
      await mutate(finishedProductSummaryKey);
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể lưu tổng kết thành phẩm."));
      console.error("Error creating finished product summary:", error);
    }
  };

  return (
    <div className="h-full min-h-[300px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[268px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Tổng kết thành phẩm
            </p>

            <FormField
              control={form.control}
              name="package_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số kiện</FormLabel>
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

            <FormField
              control={form.control}
              name="boxes_per_package"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số hộp trên kiện</FormLabel>
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

            <FormField
              control={form.control}
              name="loose_box_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số hộp lẻ</FormLabel>
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

            <FormItem>
              <FormLabel>Tổng số lượng</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={totalQuantity}
                  readOnly
                  disabled={form.formState.isSubmitting}
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
                    <Textarea
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
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
              onClick={() =>
                form.reset({
                  package_count: "",
                  boxes_per_package: "",
                  loose_box_count: "",
                  note: "",
                })
              }
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
