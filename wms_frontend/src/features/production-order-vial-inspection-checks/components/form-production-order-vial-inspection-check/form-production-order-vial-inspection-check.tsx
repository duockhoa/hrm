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
import type {
  ProductionOrderVialInspectionCheck,
  VialInspectionCheckPayload,
} from "../../types";

const integerText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldLabel} bắt buộc`)
    .regex(/^\d+$/, `${fieldLabel} phải là số nguyên không âm`);

const optionalIntegerText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .regex(/^\d*$/, `${fieldLabel} phải là số nguyên không âm`);

const formSchema = z.object({
  bag_number: integerText("Bao số").refine((value) => Number(value) > 0, {
    message: "Bao số phải lớn hơn 0",
  }),
  fiber_vial_count: optionalIntegerText("Số lọ có sợi"),
  particulate_count: optionalIntegerText("Số lượng vẩn"),
  damaged_count: optionalIntegerText("Số lượng hỏng"),
  other_defect_count: optionalIntegerText("Số lượng lỗi khác"),
  note: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  bag_number: "",
  fiber_vial_count: "",
  particulate_count: "",
  damaged_count: "",
  other_defect_count: "",
  note: "",
};

const toFormValues = (
  data?: ProductionOrderVialInspectionCheck | null,
): FormValues => ({
  bag_number: data?.bag_number ? String(data.bag_number) : "",
  fiber_vial_count:
    data?.fiber_vial_count !== null && data?.fiber_vial_count !== undefined
      ? String(data.fiber_vial_count)
      : "",
  particulate_count:
    data?.particulate_count !== null && data?.particulate_count !== undefined
      ? String(data.particulate_count)
      : "",
  damaged_count:
    data?.damaged_count !== null && data?.damaged_count !== undefined
      ? String(data.damaged_count)
      : "",
  other_defect_count:
    data?.other_defect_count !== null && data?.other_defect_count !== undefined
      ? String(data.other_defect_count)
      : "",
  note: data?.note ?? "",
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderVialInspectionCheck({
  productionOrderId,
  data,
  onClose,
  onSaved,
}: {
  productionOrderId: string | number;
  data?: ProductionOrderVialInspectionCheck | null;
  onClose?: () => void;
  onSaved?: (data: ProductionOrderVialInspectionCheck) => void;
}) {
  const isEditing = Boolean(data?.id);
  const vialInspectionChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.vialInspectionChecks(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? toFormValues(data) : defaultValues,
  });

  const resetForm = () => {
    form.reset(isEditing ? toFormValues(data) : defaultValues);
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const trimmedNote = values.note.trim();
    const nextValues: VialInspectionCheckPayload = {
      bag_number: Number(values.bag_number),
      fiber_vial_count: Number(values.fiber_vial_count || 0),
      particulate_count: Number(values.particulate_count || 0),
      damaged_count: Number(values.damaged_count || 0),
      other_defect_count: Number(values.other_defect_count || 0),
      note: trimmedNote || null,
    };

    if (isEditing) {
      if (data?.id === null || data?.id === undefined) {
        toast.error("Không tìm thấy bản ghi soi lọ.");
        return;
      }

      const payload: Partial<VialInspectionCheckPayload> = {};

      if (nextValues.bag_number !== Number(data.bag_number)) {
        payload.bag_number = nextValues.bag_number;
      }
      if (nextValues.fiber_vial_count !== Number(data.fiber_vial_count ?? 0)) {
        payload.fiber_vial_count = nextValues.fiber_vial_count;
      }
      if (nextValues.particulate_count !== Number(data.particulate_count ?? 0)) {
        payload.particulate_count = nextValues.particulate_count;
      }
      if (nextValues.damaged_count !== Number(data.damaged_count ?? 0)) {
        payload.damaged_count = nextValues.damaged_count;
      }
      if (
        nextValues.other_defect_count !== Number(data.other_defect_count ?? 0)
      ) {
        payload.other_defect_count = nextValues.other_defect_count;
      }
      if ((nextValues.note ?? null) !== (data.note ?? null)) {
        payload.note = nextValues.note;
      }

      if (Object.keys(payload).length === 0) {
        toast.info("Không có thay đổi để cập nhật.");
        return;
      }

      try {
        const savedData =
          await productionOrdersService.updateVialInspectionCheck(
            data.id,
            payload,
          );

        toast.success("Đã cập nhật soi lọ.");
        await mutate(API_ROUTES.productionOrders.vialInspectionCheckDetail(data.id));
        if (vialInspectionChecksKey) {
          await mutate(vialInspectionChecksKey);
        }
        onSaved?.(savedData);
        onClose?.();
      } catch (error: any) {
        toast.error(
          getErrorMessage(error, "Không thể cập nhật soi lọ."),
        );
        console.error("Error updating vial inspection check:", error);
      }
      return;
    }

    try {
      await productionOrdersService.createVialInspectionCheck(
        productionOrderId,
        {
          bag_number: nextValues.bag_number,
          fiber_vial_count: nextValues.fiber_vial_count,
          particulate_count: nextValues.particulate_count,
          damaged_count: nextValues.damaged_count,
          other_defect_count: nextValues.other_defect_count,
          ...(trimmedNote ? { note: trimmedNote } : {}),
        },
      );

      toast.success("Đã lưu soi lọ.");
      resetForm();
      await mutate(vialInspectionChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể lưu soi lọ."));
      console.error("Error creating vial inspection check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[540px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[508px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              {isEditing ? "Cập nhật soi lọ" : "Soi lọ"}
            </p>

            <FormField
              control={form.control}
              name="bag_number"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Bao số</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="fiber_vial_count"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Số lọ có sợi</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
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
                name="particulate_count"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Số lượng vẩn</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
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
                name="damaged_count"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Số lượng hỏng</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
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
                name="other_defect_count"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Số lượng lỗi khác</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
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
              onClick={isEditing ? onClose : resetForm}
            >
              {isEditing ? "Hủy" : "Đặt lại"}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? isEditing
                  ? "Đang cập nhật..."
                  : "Đang lưu..."
                : isEditing
                  ? "Cập nhật"
                  : "Lưu"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
