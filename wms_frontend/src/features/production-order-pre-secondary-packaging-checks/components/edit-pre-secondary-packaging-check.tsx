"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import {
  preSecondaryPackagingCheckSchema,
  type PreSecondaryPackagingCheckFormValues,
} from "../schema";
import type { ProductionOrderPreSecondaryPackagingCheck } from "../types";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditPreSecondaryPackagingCheck({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderPreSecondaryPackagingCheck;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const form = useForm<PreSecondaryPackagingCheckFormValues>({
    resolver: zodResolver(preSecondaryPackagingCheckSchema),
    defaultValues: {
      requirement: data.requirement ?? "",
      quantity_checked: String(data.quantity_checked ?? ""),
      quantity_passed: String(data.quantity_passed ?? ""),
    },
  });

  const onSubmit = async (values: PreSecondaryPackagingCheckFormValues) => {
    try {
      await productionOrdersService.updatePreSecondaryPackagingCheck(data.id, {
        requirement: values.requirement.trim(),
        quantity_checked: Number(values.quantity_checked),
        quantity_passed: Number(values.quantity_passed),
      });
      await mutate(
        API_ROUTES.productionOrders.preSecondaryPackagingCheckDetail(data.id),
      );
      if (data.production_order_id !== null && data.production_order_id !== undefined) {
        await mutate(
          API_ROUTES.productionOrders.preSecondaryPackagingChecks(
            data.production_order_id,
          ),
        );
      }
      toast.success("Đã cập nhật kiểm tra BTP trước đóng gói.");
      onSaved();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể cập nhật bản ghi kiểm tra."));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-center text-xl font-semibold uppercase">
          Cập nhật kiểm tra BTP trước đóng gói
        </p>
        <FormField
          control={form.control}
          name="requirement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Yêu cầu theo dạng bào chế</FormLabel>
              <FormControl>
                <Textarea rows={3} readOnly className="bg-gray-50" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="quantity_checked"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số lượng kiểm tra</FormLabel>
                <FormControl>
                  <Input type="number" min={1} step={1} disabled={form.formState.isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity_passed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số lượng đạt</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step={1} disabled={form.formState.isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
