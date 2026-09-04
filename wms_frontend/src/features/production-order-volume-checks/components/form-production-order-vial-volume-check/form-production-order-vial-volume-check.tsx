"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import productionSpecificationsService from "@/services/production-specifications.service";
import type { VolumeCheckPayload } from "../../types";
import VolumeCheckImagePicker from "../volume-check-image-picker";
import {
  buildPackageVolumeRequirement,
  buildVolumeRequirement,
  formatDosageFormStage,
  normalizeDecimalText,
  toNumber,
  type VolumeRequirementLimits,
  VOLUME_KEYS,
} from "../../utils";

const decimalPattern = /^\d{1,8}([.,]\d{1,2})?$/;

const volumeText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || decimalPattern.test(value), {
      message: `${fieldLabel} tối đa 2 chữ số thập phân`,
    })
    .refine((value) => !value || toNumber(value) > 0, {
      message: `${fieldLabel} phải lớn hơn 0`,
    });

const formSchema = z
  .object({
    requirement: z.string().trim(),
    unit_1_volume: volumeText("thể tích đơn vị 1"),
    unit_2_volume: volumeText("thể tích đơn vị 2"),
    unit_3_volume: volumeText("thể tích đơn vị 3"),
    unit_4_volume: volumeText("thể tích đơn vị 4"),
    unit_5_volume: volumeText("thể tích đơn vị 5"),
    unit_6_volume: volumeText("thể tích đơn vị 6"),
  })
  .refine((values) => values.unit_1_volume.trim() !== "", {
    message: "Vui lòng nhập thể tích đơn vị 1.",
    path: ["unit_1_volume"],
  });

type FormValues = z.infer<typeof formSchema>;

const createDefaultValues = (requirement = ""): FormValues => ({
  requirement,
  ...VOLUME_KEYS.reduce(
    (values, key) => ({
      ...values,
      [key]: "",
    }),
    {} as Omit<FormValues, "requirement">,
  ),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderVialVolumeCheck({
  productionOrderId,
  itemCode,
  packageType = "lọ",
  dosageFormStage = "Lọ dịch",
  title = "Kiểm tra thể tích lọ",
  productionSpecification,
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  packageType?: string;
  dosageFormStage?: string;
  title?: string;
  productionSpecification?: VolumeRequirementLimits;
  onClose?: () => void;
}) {
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const { data: cylinderCalibration } = useSWR(
    productionOrderId
      ? API_ROUTES.productionOrders.cylinderCalibration(productionOrderId)
      : null,
    () => productionOrdersService.fetchCylinderCalibration(productionOrderId),
  );
  const cylinderCalibrationNumber = cylinderCalibration?.calibration_number;
  const buildRequirement =
    packageType.trim().toLocaleLowerCase("vi-VN") === "gói"
      ? buildPackageVolumeRequirement
      : buildVolumeRequirement;
  const orderRequirementValue = buildRequirement(
    productionSpecification,
    cylinderCalibrationNumber,
  );
  const { data: fetchedProductionSpecification } = useSWR(
    !orderRequirementValue && itemCodeValue
      ? `${API_ROUTES.productionSpecifications.base}/${itemCodeValue}`
      : null,
    () =>
      productionSpecificationsService.fetchProductionSpecificationByItemCode(
        itemCodeValue,
      ),
  );
  const requirementValue =
    orderRequirementValue ||
    buildRequirement(fetchedProductionSpecification, cylinderCalibrationNumber);
  const volumeChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.volumeChecks(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(requirementValue),
  });
  const [images, setImages] = useState<File[]>([]);

  useEffect(() => {
    form.setValue("requirement", requirementValue);
  }, [form, requirementValue]);

  const resetForm = () => {
    form.reset(createDefaultValues(requirementValue));
    setImages([]);
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const payload = VOLUME_KEYS.reduce(
      (currentPayload, key) => {
        const value = values[key].trim();

        if (!value) {
          return currentPayload;
        }

        return {
          ...currentPayload,
          [key]: normalizeDecimalText(value),
        };
      },
      {
        package_type: packageType,
        requirement: values.requirement.trim() || null,
        dosage_form_stage: dosageFormStage.trim() || null,
      } as VolumeCheckPayload,
    );

    try {
      const savedData = await productionOrdersService.createVolumeCheck(
        productionOrderId,
        payload,
      );

      if (images.length > 0) {
        if (savedData?.id === null || savedData?.id === undefined) {
          throw new Error("Không tìm thấy bản ghi để thêm ảnh.");
        }

        await productionOrdersService.addVolumeCheckImages(savedData.id, images);
      }

      toast.success(`Đã lưu ${title.toLocaleLowerCase("vi-VN")}.`);
      resetForm();
      await mutate(volumeChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          `Không thể lưu ${title.toLocaleLowerCase("vi-VN")}.`,
        ),
      );
      console.error("Error creating volume check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[560px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[528px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              {title}
            </p>

            <FormField
              control={form.control}
              name="requirement"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Yêu cầu</FormLabel>
                    <FormControl>
                      <Textarea
                        readOnly
                        aria-readonly="true"
                        className="bg-gray-100 text-gray-700"
                        placeholder=""
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Dạng bào chế</Label>
              <Input
                readOnly
                aria-readonly="true"
                className="bg-gray-100 text-gray-700"
                value={formatDosageFormStage(dosageFormStage)}
              />
            </div>

            <div className="flex flex-col gap-4">
              {VOLUME_KEYS.map((key, index) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>Đơn vị {index + 1} (ml)</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            disabled={form.formState.isSubmitting}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <VolumeCheckImagePicker
              images={images}
              onChange={setImages}
              disabled={form.formState.isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={resetForm}
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
