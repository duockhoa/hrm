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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import {
  LINE_CLEARANCE_CHECK_TYPES,
  LINE_CLEARANCE_REQUIREMENTS,
  LINE_CLEARANCE_RESULTS,
} from "../utils";
import CheckTypeToggle from "./check-type-toggle";
import RecentProductionOrderSelect from "./recent-production-order-select";
import ResultToggle from "./result-toggle";

const formSchema = z.object({
  check_type: z.enum(LINE_CLEARANCE_CHECK_TYPES, {
    message: "Vui lòng chọn loại kiểm tra",
  }),
  requirement: z.string().trim().min(1, "Vui lòng nhập yêu cầu"),
  result: z.enum(LINE_CLEARANCE_RESULTS, {
    message: "Vui lòng chọn kết quả",
  }),
  previous_production_order_id: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0),
      "ID lệnh sản xuất trước phải là số nguyên dương",
    ),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  check_type: "Trước sản xuất",
  requirement: LINE_CLEARANCE_REQUIREMENTS["Trước sản xuất"],
  result: "Đạt",
  previous_production_order_id: "",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderLineClearanceCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  const checkType =
    useWatch({ control: form.control, name: "check_type" }) ?? "Trước sản xuất";

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const previousId = values.previous_production_order_id.trim();
    try {
      await productionOrdersService.createLineClearanceCheck(productionOrderId, {
        check_type: values.check_type.trim(),
        requirement: values.requirement.trim(),
        result: values.result,
        ...(values.check_type === "Trước sản xuất" && previousId
          ? { previous_production_order_id: Number(previousId) }
          : {}),
      });
      toast.success("Đã lưu hạng mục dọn quang dây chuyền.");
      form.reset(defaultValues);
      await mutate(
        API_ROUTES.productionOrders.lineClearanceChecks(productionOrderId),
      );
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu hạng mục dọn quang dây chuyền."),
      );
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            Dọn quang dây chuyền
          </p>

          <FormField
            control={form.control}
            name="check_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loại kiểm tra</FormLabel>
                <FormControl>
                  <CheckTypeToggle
                    value={field.value}
                    disabled={form.formState.isSubmitting}
                    onChange={(value) => {
                      field.onChange(value);
                      if (value === "Sau sản xuất") {
                        form.setValue("previous_production_order_id", "");
                      }
                      form.setValue(
                        "requirement",
                        LINE_CLEARANCE_REQUIREMENTS[value],
                        { shouldDirty: true, shouldValidate: true },
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requirement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yêu cầu</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Nội dung yêu cầu dọn quang"
                    rows={6}
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
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kết quả</FormLabel>
                <FormControl>
                  <ResultToggle
                    value={field.value}
                    disabled={form.formState.isSubmitting}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {checkType === "Trước sản xuất" ? (
            <FormField
              control={form.control}
              name="previous_production_order_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lô sản xuất trước</FormLabel>
                  <FormControl>
                    <RecentProductionOrderSelect
                      value={field.value}
                      currentProductionOrderId={productionOrderId}
                      disabled={form.formState.isSubmitting}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => form.reset(defaultValues)}
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
