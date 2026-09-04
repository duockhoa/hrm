"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import useSWR from "swr";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductionWorkshop } from "@/features/production-workshops/types";
import { API_ROUTES } from "@/lib/api-routes";
import {
  productOrdersService,
  productionWorkshopsService,
} from "@/services/index.service";
import type {
  DisinfectantPreparationPayload,
  ProductionOrderDisinfectantPreparation,
} from "../../types";
import { normalizeDecimalText } from "../../utils";

const decimalPattern = /^\d{1,8}([.,]\d{1,4})?$/;
const amountPattern = /^\d{1,8}([.,]\d{1,4})?$/;
const ETHANOL_70_DISINFECTANT_NAME = "Cồn 70";
const ETHANOL_70_TARGET_CONTENT = 70;
const ETHANOL_96_BASE_MATERIAL_NAME = "Ethanol 96%";
const ETHANOL_96_BASE_MATERIAL_CONTENT = "96";
const H2O2_3_DISINFECTANT_NAME = "H2O2 3%";
const H2O2_3_TARGET_CONTENT = 3;
const H2O2_50_BASE_MATERIAL_NAME = "H2O2 50%";
const H2O2_50_BASE_MATERIAL_CONTENT = "50";

const DISINFECTANT_NAME_OPTIONS = [
  ETHANOL_70_DISINFECTANT_NAME,
  H2O2_3_DISINFECTANT_NAME,
  "Benzal 10%",
  "Benzal 1%",
  "Benzal 0,5%",
  "Benzal 0,03%",
].map((value) => ({
  value,
  label: value,
}));

const DISINFECTANT_PURPOSE_OPTIONS = [
  "Vệ sinh nhà xưởng, thiết bị",
  "Xử lý bao bì cấp 1",
];
const DEFAULT_DISINFECTANT_PURPOSE = DISINFECTANT_PURPOSE_OPTIONS[0];

const formatGuidanceNumber = (value: number) =>
  value.toLocaleString("vi-VN", { maximumFractionDigits: 4 });

const positiveDecimal = (label: string, pattern = decimalPattern) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${label}`)
    .refine((value) => pattern.test(value), {
      message: `${label} tối đa 4 chữ số thập phân`,
    })
    .refine((value) => Number(normalizeDecimalText(value)) > 0, {
      message: `${label} phải lớn hơn 0`,
    });

const formSchema = z.object({
  workshop_id: z.string().trim().min(1, "Vui lòng chọn xưởng sản xuất"),
  disinfectant_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên chất sát khuẩn")
    .max(255, "Tên chất sát khuẩn tối đa 255 ký tự"),
  purpose: z.string().trim().min(1, "Vui lòng nhập mục đích sử dụng"),
  base_material_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên nguyên liệu gốc")
    .max(255, "Tên nguyên liệu gốc tối đa 255 ký tự"),
  base_material_content: positiveDecimal("hàm lượng nguyên liệu gốc"),
  base_material_amount_l: positiveDecimal("lượng nguyên liệu gốc", amountPattern),
  prepared_volume_l: positiveDecimal("thể tích pha chế", amountPattern),
  actual_concentration: positiveDecimal("nồng độ thực tế"),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  workshop_id: "",
  disinfectant_name: "",
  purpose: DEFAULT_DISINFECTANT_PURPOSE,
  base_material_name: "",
  base_material_content: "",
  base_material_amount_l: "",
  prepared_volume_l: "",
  actual_concentration: "",
};

const toFormValues = (
  data?: ProductionOrderDisinfectantPreparation | null,
): FormValues => ({
  workshop_id: data?.workshop_id ? String(data.workshop_id) : "",
  disinfectant_name: data?.disinfectant_name ?? "",
  purpose: data?.purpose ?? DEFAULT_DISINFECTANT_PURPOSE,
  base_material_name: data?.base_material_name ?? "",
  base_material_content: data?.base_material_content
    ? String(data.base_material_content)
    : "",
  base_material_amount_l: data?.base_material_amount_l
    ? String(data.base_material_amount_l)
    : "",
  prepared_volume_l: data?.prepared_volume_l
    ? String(data.prepared_volume_l)
    : "",
  actual_concentration: data?.actual_concentration
    ? String(data.actual_concentration)
    : "",
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderDisinfectantPreparation({
  productionOrderId,
  data,
  onClose,
  onSaved,
}: {
  productionOrderId?: string | number;
  data?: ProductionOrderDisinfectantPreparation | null;
  onClose?: () => void;
  onSaved?: (data: ProductionOrderDisinfectantPreparation) => void;
}) {
  const isEditing = Boolean(data?.id);
  const listKey =
    productionOrderId || data?.production_order_id
      ? API_ROUTES.productionOrders.disinfectantPreparations(
          productionOrderId ?? data?.production_order_id ?? "",
        )
      : null;

  const { data: workshops } = useSWR<ProductionWorkshop[]>(
    API_ROUTES.productionWorkshops.base,
    productionWorkshopsService.fetchProductionWorkshops,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(data),
  });
  const [disinfectantName, baseMaterialContent, preparedVolume] = useWatch({
    control: form.control,
    name: [
      "disinfectant_name",
      "base_material_content",
      "prepared_volume_l",
    ],
  });
  const baseMaterialContentNumber = Number(
    normalizeDecimalText(baseMaterialContent),
  );
  const preparedVolumeNumber = Number(normalizeDecimalText(preparedVolume));
  const dilutionGuidance =
    disinfectantName === ETHANOL_70_DISINFECTANT_NAME
      ? {
          targetContent: ETHANOL_70_TARGET_CONTENT,
          targetName: "cồn 70%",
          baseName: `cồn ${formatGuidanceNumber(baseMaterialContentNumber)}%`,
        }
      : disinfectantName === H2O2_3_DISINFECTANT_NAME
        ? {
            targetContent: H2O2_3_TARGET_CONTENT,
            targetName: "H2O2 3%",
            baseName: `H2O2 ${formatGuidanceNumber(baseMaterialContentNumber)}%`,
          }
        : null;
  const shouldShowDilutionGuidance =
    dilutionGuidance !== null &&
    Number.isFinite(baseMaterialContentNumber) &&
    baseMaterialContentNumber > 0 &&
    Number.isFinite(preparedVolumeNumber) &&
    preparedVolumeNumber > 0;
  const suggestedBaseMaterialAmount = shouldShowDilutionGuidance
    ? Math.floor(
        ((preparedVolumeNumber * dilutionGuidance.targetContent) /
          baseMaterialContentNumber) *
          100,
      ) * 10
    : null;

  useEffect(() => {
    form.reset(toFormValues(data));
  }, [data, form]);

  const resetForm = () => {
    form.reset(isEditing ? toFormValues(data) : defaultValues);
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId && !data?.production_order_id) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const payload: DisinfectantPreparationPayload = {
      workshop_id: values.workshop_id,
      disinfectant_name: values.disinfectant_name.trim(),
      purpose: values.purpose.trim(),
      base_material_name: values.base_material_name.trim(),
      base_material_content: normalizeDecimalText(values.base_material_content),
      base_material_amount_l: normalizeDecimalText(values.base_material_amount_l),
      prepared_volume_l: normalizeDecimalText(values.prepared_volume_l),
      actual_concentration: normalizeDecimalText(values.actual_concentration),
    };

    try {
      const savedData =
        isEditing && data?.id
          ? await productOrdersService.updateDisinfectantPreparation(
              data.id,
              payload,
            )
          : await productOrdersService.createDisinfectantPreparation(
              productionOrderId ?? data?.production_order_id ?? "",
              payload,
            );

      toast.success(
        isEditing
          ? "Đã cập nhật dữ liệu pha chế chất sát khuẩn."
          : "Đã lưu dữ liệu pha chế chất sát khuẩn.",
      );
      if (!isEditing) {
        form.reset(defaultValues);
      }
      await mutate(listKey);
      if (data?.id) {
        await mutate(
          API_ROUTES.productionOrders.disinfectantPreparationDetail(data.id),
        );
      }
      onSaved?.(savedData);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể lưu dữ liệu pha chế chất sát khuẩn.",
        ),
      );
      console.error("Error saving disinfectant preparation:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[520px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[488px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Pha chế chất sát khuẩn
            </p>

            <FormField
              control={form.control}
              name="workshop_id"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Xưởng sản xuất</FormLabel>
                    <Select
                      value={field.value}
                      disabled={form.formState.isSubmitting}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn xưởng sản xuất" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(workshops ?? []).map((workshop) => (
                          <SelectItem
                            key={workshop.id}
                            value={String(workshop.id)}
                          >
                            {workshop.code
                              ? `${workshop.code} - ${workshop.name}`
                              : workshop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disinfectant_name"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Tên chất sát khuẩn</FormLabel>
                    <FormControl>
                      <Combobox
                        autoHighlight
                        items={DISINFECTANT_NAME_OPTIONS}
                        value={
                          DISINFECTANT_NAME_OPTIONS.find(
                            (option) => option.value === field.value,
                          ) ?? null
                        }
                        onValueChange={(option) => {
                          const selectedValue = option?.value ?? "";

                          field.onChange(selectedValue);
                          if (selectedValue === ETHANOL_70_DISINFECTANT_NAME) {
                            form.setValue(
                              "base_material_name",
                              ETHANOL_96_BASE_MATERIAL_NAME,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              },
                            );
                            form.setValue(
                              "base_material_content",
                              ETHANOL_96_BASE_MATERIAL_CONTENT,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              },
                            );
                          }
                          if (selectedValue === H2O2_3_DISINFECTANT_NAME) {
                            form.setValue(
                              "base_material_name",
                              H2O2_50_BASE_MATERIAL_NAME,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              },
                            );
                            form.setValue(
                              "base_material_content",
                              H2O2_50_BASE_MATERIAL_CONTENT,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              },
                            );
                          }
                        }}
                        itemToStringLabel={(item) => item.label}
                        itemToStringValue={(item) => item.value}
                        isItemEqualToValue={(item, value) =>
                          item.value === value.value
                        }
                      >
                        <ComboboxInput
                          className="w-full"
                          placeholder="Tìm kiếm"
                          disabled={form.formState.isSubmitting}
                          showClear
                        />
                        <ComboboxContent>
                          <ComboboxEmpty>
                            Không tìm thấy chất sát khuẩn.
                          </ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item.value} value={item}>
                                {item.label}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Mục đích sử dụng</FormLabel>
                    <Select
                      value={field.value}
                      disabled={form.formState.isSubmitting}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn mục đích sử dụng" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DISINFECTANT_PURPOSE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="base_material_name"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Nguyên liệu gốc</FormLabel>
                    <FormControl>
                      <Input disabled={form.formState.isSubmitting} {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="base_material_content"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Hàm lượng gốc (%)</FormLabel>
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

              <FormField
                control={form.control}
                name="prepared_volume_l"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Thể tích pha chế (lít)</FormLabel>
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

              {suggestedBaseMaterialAmount !== null && (
                <div className="space-y-2">
                  <FormLabel>Thông tin hướng dẫn</FormLabel>
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-950">
                    Quy trình: Để tạo ra{" "}
                    {formatGuidanceNumber(preparedVolumeNumber)} lít dung dịch{" "}
                    {dilutionGuidance?.targetName}, hãy sử dụng{" "}
                    {suggestedBaseMaterialAmount} ml{" "}
                    {dilutionGuidance?.baseName} và hòa thêm nước cho đến vạch thể
                    tích{" "}
                    {formatGuidanceNumber(preparedVolumeNumber)} lít.
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="base_material_amount_l"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Lượng nguyên liệu gốc (lít)</FormLabel>
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

              <FormField
                control={form.control}
                name="actual_concentration"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Nồng độ thực tế (%)</FormLabel>
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
            </div>
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
