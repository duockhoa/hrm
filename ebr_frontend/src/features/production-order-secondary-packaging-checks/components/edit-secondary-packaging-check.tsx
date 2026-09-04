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
import type {
  ProductionOrderSecondaryPackagingCheck,
  SecondaryPackagingCheckPayload,
} from "../types";
import StageRequirementFields from "./stage-requirement-fields";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditSecondaryPackagingCheck({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderSecondaryPackagingCheck;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const initialValues: SecondaryPackagingCheckFormValues = {
    stage: data.stage ?? "",
    requirement: data.requirement ?? "",
    quantity_checked: String(data.quantity_checked ?? ""),
    quantity_passed: String(data.quantity_passed ?? ""),
  };
  const form = useForm<SecondaryPackagingCheckFormValues>({
    resolver: zodResolver(secondaryPackagingCheckSchema),
    defaultValues: initialValues,
  });
  const selectedRequirement =
    useWatch({ control: form.control, name: "requirement" }) ?? "";

  const onSubmit = async (values: SecondaryPackagingCheckFormValues) => {
    if (data.id === null || data.id === undefined) return;
    const payload: Partial<SecondaryPackagingCheckPayload> = {};
    const stage = values.stage.trim();
    const requirement = values.requirement.trim();
    const quantityChecked = Number(values.quantity_checked);
    const quantityPassed = Number(values.quantity_passed);

    if (stage !== initialValues.stage.trim()) payload.stage = stage;
    if (requirement !== initialValues.requirement.trim()) payload.requirement = requirement;
    if (quantityChecked !== Number(initialValues.quantity_checked)) payload.quantity_checked = quantityChecked;
    if (quantityPassed !== Number(initialValues.quantity_passed)) payload.quantity_passed = quantityPassed;

    if (Object.keys(payload).length === 0) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      await productionOrdersService.updateSecondaryPackagingCheck(data.id, payload);
      toast.success("Đã cập nhật kiểm tra đóng gói bao bì cấp 2.");
      await mutate(API_ROUTES.productionOrders.secondaryPackagingCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(API_ROUTES.productionOrders.secondaryPackagingChecks(data.production_order_id));
      }
      onSaved?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể cập nhật kiểm tra đóng gói bao bì cấp 2."));
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">Cập nhật kiểm tra bao bì cấp 2</p>
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
            <FormItem className="hidden"><FormControl><Input type="hidden" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="quantity_checked" render={({ field }) => (
            <FormItem><FormLabel>Số lượng kiểm tra</FormLabel><FormControl><Input type="number" min={1} step={1} disabled={form.formState.isSubmitting} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="quantity_passed" render={({ field }) => (
            <FormItem><FormLabel>Số lượng đạt yêu cầu</FormLabel><FormControl><Input type="number" min={0} step={1} disabled={form.formState.isSubmitting} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onCancel}>Hủy</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Đang cập nhật..." : "Cập nhật"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
