"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
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
import {
  secondaryPackagingCheckSchema,
  type SecondaryPackagingCheckFormValues,
} from "../schema";
import StageRequirementFields from "./stage-requirement-fields";

const defaultValues: SecondaryPackagingCheckFormValues = {
  stage: "",
  requirement: "",
  quantity_checked: "",
  quantity_passed: "",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderSecondaryPackagingCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const form = useForm<SecondaryPackagingCheckFormValues>({
    resolver: zodResolver(secondaryPackagingCheckSchema),
    defaultValues,
  });
  const selectedRequirement =
    useWatch({ control: form.control, name: "requirement" }) ?? "";

  const onSubmit = async (values: SecondaryPackagingCheckFormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    try {
      await productionOrdersService.createSecondaryPackagingCheck(
        productionOrderId,
        {
          stage: values.stage.trim(),
          requirement: values.requirement.trim(),
          quantity_checked: Number(values.quantity_checked),
          quantity_passed: Number(values.quantity_passed),
        },
      );
      toast.success("Đã lưu kiểm tra đóng gói bao bì cấp 2.");
      form.reset(defaultValues);
      await mutate(
        API_ROUTES.productionOrders.secondaryPackagingChecks(productionOrderId),
      );
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể lưu kiểm tra đóng gói bao bì cấp 2.",
        ),
      );
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            Kiểm tra đóng gói bao bì cấp 2
          </p>
          <FormField control={form.control} name="stage" render={({ field }) => (
            <FormItem>
              <FormLabel>Công đoạn</FormLabel>
              <FormControl>
                <StageRequirementFields
                  stage={field.value}
                  requirement={selectedRequirement}
                  disabled={form.formState.isSubmitting}
                  onChange={(stage, requirement) => {
                    field.onChange(stage);
                    form.setValue("requirement", requirement, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="requirement" render={({ field }) => (
            <FormItem className="hidden">
              <FormControl><Input type="hidden" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="quantity_checked" render={({ field }) => (
            <FormItem>
              <FormLabel>Số lượng kiểm tra</FormLabel>
              <FormControl><Input type="number" min={1} step={1} disabled={form.formState.isSubmitting} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="quantity_passed" render={({ field }) => (
            <FormItem>
              <FormLabel>Số lượng đạt yêu cầu</FormLabel>
              <FormControl><Input type="number" min={0} step={1} disabled={form.formState.isSubmitting} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={() => form.reset(defaultValues)}>
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
