"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
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
import { dosageFormsService } from "@/services/index.service";
import productionOrdersService from "@/services/product-orders.service";
import {
  preSecondaryPackagingCheckSchema,
  type PreSecondaryPackagingCheckFormValues,
} from "../schema";
import { validateCheckImages } from "../utils";
import MultiImagePicker from "./multi-image-picker";

const defaultValues: PreSecondaryPackagingCheckFormValues = {
  requirement: "",
  quantity_checked: "",
  quantity_passed: "",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormPreSecondaryPackagingCheck({
  productionOrderId,
  dosageFormId,
  dosageFormName,
  dosageFormRequirement,
  onClose,
}: {
  productionOrderId: string | number;
  dosageFormId?: string | number | null;
  dosageFormName?: string | null;
  dosageFormRequirement?: string | null;
  onClose?: () => void;
}) {
  const [images, setImages] = React.useState<File[]>([]);
  const form = useForm<PreSecondaryPackagingCheckFormValues>({
    resolver: zodResolver(preSecondaryPackagingCheckSchema),
    defaultValues,
  });
  const {
    data: dosageForm,
    error: dosageFormError,
    isLoading: isLoadingDosageForm,
  } = useSWR(
    dosageFormId !== null && dosageFormId !== undefined
      ? API_ROUTES.dosageForms.detail(dosageFormId)
      : null,
    () => dosageFormsService.fetchById(dosageFormId as string | number),
  );
  const resolvedDosageFormName = dosageForm?.name ?? dosageFormName ?? "";
  const resolvedRequirement = (
    dosageForm !== undefined
      ? dosageForm.sensory_requirement ?? ""
      : dosageFormRequirement ?? ""
  ).trim();

  React.useEffect(() => {
    form.setValue("requirement", resolvedRequirement, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [form, resolvedRequirement]);

  const resetForm = () => {
    form.reset({ ...defaultValues, requirement: resolvedRequirement });
    setImages([]);
  };

  const onSubmit = async (values: PreSecondaryPackagingCheckFormValues) => {
    const imageError = validateCheckImages(images);
    if (imageError) {
      toast.error(imageError);
      return;
    }

    try {
      if (images.length > 0) {
        const formData = new FormData();
        formData.append("requirement", values.requirement.trim());
        formData.append("quantity_checked", values.quantity_checked);
        formData.append("quantity_passed", values.quantity_passed);
        images.forEach((image) => formData.append("images", image));
        await productionOrdersService.createPreSecondaryPackagingCheck(
          productionOrderId,
          formData,
        );
      } else {
        await productionOrdersService.createPreSecondaryPackagingCheck(
          productionOrderId,
          {
            requirement: values.requirement.trim(),
            quantity_checked: Number(values.quantity_checked),
            quantity_passed: Number(values.quantity_passed),
          },
        );
      }

      await mutate(
        API_ROUTES.productionOrders.preSecondaryPackagingChecks(
          productionOrderId,
        ),
      );
      toast.success("Đã lưu kiểm tra BTP trước đóng gói bao bì cấp 2.");
      resetForm();
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể lưu kiểm tra BTP trước đóng gói bao bì cấp 2.",
        ),
      );
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            Kiểm tra BTP trước đóng gói bao bì cấp 2
          </p>

          <FormField
            control={form.control}
            name="requirement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yêu cầu theo dạng bào chế</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    readOnly
                    className="bg-gray-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                {isLoadingDosageForm ? (
                  <p className="text-xs text-gray-500">
                    Đang tải yêu cầu của dạng bào chế...
                  </p>
                ) : dosageFormError ? (
                  <p className="text-xs text-red-600">
                    Không thể tải yêu cầu của dạng bào chế.
                  </p>
                ) : dosageFormId === null || dosageFormId === undefined ? (
                  <p className="text-xs text-red-600">
                    Sản phẩm chưa được gán dạng bào chế.
                  </p>
                ) : !resolvedRequirement ? (
                  <p className="text-xs text-red-600">
                    Dạng bào chế {resolvedDosageFormName || `#${dosageFormId}`} chưa
                    có yêu cầu cảm quan.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Dạng bào chế: {resolvedDosageFormName || `#${dosageFormId}`}
                  </p>
                )}
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
                    <Input
                      type="number"
                      min={1}
                      step={1}
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
              name="quantity_passed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số lượng đạt</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <MultiImagePicker
            files={images}
            onChange={setImages}
            disabled={form.formState.isSubmitting}
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
            <Button
              type="submit"
              disabled={
                form.formState.isSubmitting ||
                isLoadingDosageForm ||
                Boolean(dosageFormError) ||
                !resolvedRequirement
              }
            >
              {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
