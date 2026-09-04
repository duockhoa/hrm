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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { PendingCancellationItem, PendingProcessItem } from "../types";
import { getErrorMessage } from "../utils";

const formSchema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, "Số lượng là bắt buộc")
    .regex(/^\d+$/, "Số lượng phải là số nguyên không âm"),
  reason: z.string().trim().min(1, "Lý do là bắt buộc"),
  plan: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type PendingKind = "process" | "cancellation";

export default function PendingItemForm({
  kind,
  summaryId,
  data,
  onSaved,
  onCancel,
}: {
  kind: PendingKind;
  summaryId: string | number;
  data?: PendingProcessItem | PendingCancellationItem | null;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const isProcess = kind === "process";
  const isEditing = data?.id !== null && data?.id !== undefined;
  const processData = data as PendingProcessItem | undefined;
  const cancellationData = data as PendingCancellationItem | undefined;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: String(
        isProcess
          ? (processData?.pending_quantity ?? "")
          : (cancellationData?.cancellation_quantity ?? ""),
      ),
      reason: isProcess
        ? (processData?.pending_reason ?? "")
        : (cancellationData?.cancellation_reason ?? ""),
      plan: isProcess
        ? (processData?.processing_plan ?? "")
        : (cancellationData?.cancellation_plan ?? ""),
    },
  });
  const detailKey =
    API_ROUTES.productionOrders.postSecondaryPackagingSummaryDetail(summaryId);

  const submit = async (values: FormValues) => {
    const quantity = Number(values.quantity);

    try {
      if (isProcess) {
        const payload = {
          pending_quantity: quantity,
          pending_reason: values.reason.trim(),
          processing_plan: values.plan?.trim() || null,
        };
        if (isEditing && data?.id !== null && data?.id !== undefined) {
          await productionOrdersService.updatePostSecondaryPackagingPendingProcessItem(
            data.id,
            payload,
          );
        } else {
          await productionOrdersService.createPostSecondaryPackagingPendingProcessItem(
            summaryId,
            payload,
          );
        }
      } else {
        const payload = {
          cancellation_quantity: quantity,
          cancellation_reason: values.reason.trim(),
          cancellation_plan: values.plan?.trim() || null,
        };
        if (isEditing && data?.id !== null && data?.id !== undefined) {
          await productionOrdersService.updatePostSecondaryPackagingPendingCancellationItem(
            data.id,
            payload,
          );
        } else {
          await productionOrdersService.createPostSecondaryPackagingPendingCancellationItem(
            summaryId,
            payload,
          );
        }
      }

      toast.success(
        `Đã ${isEditing ? "cập nhật" : "thêm"} dòng ${isProcess ? "chờ xử lý" : "chờ hủy"}.`,
      );
      await mutate(detailKey);
      onSaved?.();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          `Không thể lưu dòng ${isProcess ? "chờ xử lý" : "chờ hủy"}.`,
        ),
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <div className="space-y-1 text-center">
          <h3 className="text-lg font-semibold">
            {isEditing ? "Cập nhật" : "Thêm"}{" "}
            {isProcess ? "chờ xử lý" : "chờ hủy"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Ghi rõ số lượng, nguyên nhân và hướng giải quyết.
          </p>
        </div>

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Số lượng *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isProcess ? "Lý do chờ xử lý" : "Lý do chờ hủy"} *
              </FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isProcess
                  ? "Phương án xử lý (không bắt buộc)"
                  : "Phương án hủy (không bắt buộc)"}
              </FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
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
            onClick={onCancel}
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
