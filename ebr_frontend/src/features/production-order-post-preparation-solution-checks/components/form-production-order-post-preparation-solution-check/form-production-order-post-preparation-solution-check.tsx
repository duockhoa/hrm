"use client";

import * as React from "react";
import { Camera, ImageUp } from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import userService from "@/services/user.service";
import type { ProductionOrderPostPreparationSolutionCheck } from "../../types";
import { normalizeDecimalText } from "../../utils";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const SOLUTION_CLARITY_OPTIONS = ["Dịch trong", "Dịch đục"] as const;

const optionalPh = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" || /^(\d{1,2})([,.]\d{1,2})?$/.test(value) || value === "14",
    { message: "pH tối đa 2 chữ số sau dấu phẩy" },
  )
  .refine(
    (value) => {
      if (value === "") {
        return true;
      }
      const numberValue = Number(normalizeDecimalText(value));
      return numberValue >= 0 && numberValue <= 14;
    },
    { message: "pH phải nằm trong khoảng 0 đến 14" },
  );

const formSchema = z.object({
  solution_color: z.string(),
  solution_clarity: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        SOLUTION_CLARITY_OPTIONS.includes(
          value as (typeof SOLUTION_CLARITY_OPTIONS)[number],
        ),
      { message: "Độ trong dịch chỉ được chọn Dịch trong hoặc Dịch đục" },
    ),
  solution_ph_1: optionalPh,
  solution_ph_2: optionalPh,
  solution_ph_3: optionalPh,
});

type FormValues = z.infer<typeof formSchema>;
type ImageField = "final_volume_image" | "solution_image";
type SolutionClarityValue = "" | (typeof SOLUTION_CLARITY_OPTIONS)[number];

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const toInputValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value).replace(".", ",");

const toClarityValue = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  if (value === "Trong") {
    return "Dịch trong";
  }

  if (value === "Đục") {
    return "Dịch đục";
  }

  return SOLUTION_CLARITY_OPTIONS.includes(
    value as (typeof SOLUTION_CLARITY_OPTIONS)[number],
  )
    ? value
    : "";
};

const toFormValues = (
  data?: ProductionOrderPostPreparationSolutionCheck,
): FormValues => ({
  solution_color: data?.solution_color ?? "",
  solution_clarity: toClarityValue(data?.solution_clarity),
  solution_ph_1: toInputValue(data?.solution_ph_1),
  solution_ph_2: toInputValue(data?.solution_ph_2),
  solution_ph_3: toInputValue(data?.solution_ph_3),
});

const appendOptionalText = (
  formData: FormData,
  key: keyof FormValues,
  value: string,
) => {
  formData.append(key, value.trim() === "" ? "" : value.trim());
};

function SolutionClarityToggle({
  value,
  disabled,
  onChange,
}: {
  value: SolutionClarityValue;
  disabled?: boolean;
  onChange: (value: SolutionClarityValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SOLUTION_CLARITY_OPTIONS.map((option) => {
        const isSelected = value === option;
        const isClearSolution = option === "Dịch trong";

        return (
          <Button
            key={option}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-pressed={isSelected}
            className={
              isSelected
                ? isClearSolution
                  ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  : "border-red-600 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                : ""
            }
            onClick={() => onChange(isSelected ? "" : option)}
          >
            {option}
          </Button>
        );
      })}
    </div>
  );
}

export default function FormProductionOrderPostPreparationSolutionCheck({
  productionOrderId,
  data,
  onClose,
  onSaved,
}: {
  productionOrderId?: string | number;
  data?: ProductionOrderPostPreparationSolutionCheck;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const isEdit = data?.id !== undefined && data.id !== null;
  const [images, setImages] = React.useState<Record<ImageField, File | null>>({
    final_volume_image: null,
    solution_image: null,
  });
  const [fileInputKey, setFileInputKey] = React.useState(0);
  const finalVolumeFileRef = React.useRef<HTMLInputElement>(null);
  const finalVolumeCameraRef = React.useRef<HTMLInputElement>(null);
  const solutionFileRef = React.useRef<HTMLInputElement>(null);
  const solutionCameraRef = React.useRef<HTMLInputElement>(null);
  const initialValues = React.useMemo(() => toFormValues(data), [data]);
  const listProductionOrderId = productionOrderId ?? data?.production_order_id;
  const checksKey = listProductionOrderId
    ? API_ROUTES.productionOrders.postPreparationSolutionChecks(
        listProductionOrderId,
      )
    : null;
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useSWR(
    API_ROUTES.users.me,
    userService.fetcherMe,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });
  const isFormDisabled = form.formState.isSubmitting || isLoadingCurrentUser;

  const resetForm = () => {
    form.reset(toFormValues(data));
    setImages({ final_volume_image: null, solution_image: null });
    setFileInputKey((key) => key + 1);
  };

  const selectImage = (field: ImageField, files: FileList | null) => {
    const file = files?.[0] ?? null;

    if (!file) {
      setImages((current) => ({ ...current, [field]: null }));
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Ảnh chỉ nhận JPG, PNG, WEBP hoặc GIF.");
      setImages((current) => ({ ...current, [field]: null }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Ảnh tối đa 20MB.");
      setImages((current) => ({ ...current, [field]: null }));
      return;
    }

    setImages((current) => ({ ...current, [field]: file }));
  };

  const onSubmit = async (values: FormValues) => {
    if (!isEdit && !productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (!currentUser?.id) {
      toast.error("Không tìm thấy thông tin người dùng hiện tại.");
      return;
    }

    const normalizedValues: FormValues = {
      solution_color: values.solution_color.trim(),
      solution_clarity: values.solution_clarity.trim(),
      solution_ph_1:
        values.solution_ph_1.trim() === ""
          ? ""
          : normalizeDecimalText(values.solution_ph_1),
      solution_ph_2:
        values.solution_ph_2.trim() === ""
          ? ""
          : normalizeDecimalText(values.solution_ph_2),
      solution_ph_3:
        values.solution_ph_3.trim() === ""
          ? ""
          : normalizeDecimalText(values.solution_ph_3),
    };
    const normalizedInitialValues: FormValues = {
      solution_color: initialValues.solution_color.trim(),
      solution_clarity: initialValues.solution_clarity.trim(),
      solution_ph_1:
        initialValues.solution_ph_1.trim() === ""
          ? ""
          : normalizeDecimalText(initialValues.solution_ph_1),
      solution_ph_2:
        initialValues.solution_ph_2.trim() === ""
          ? ""
          : normalizeDecimalText(initialValues.solution_ph_2),
      solution_ph_3:
        initialValues.solution_ph_3.trim() === ""
          ? ""
          : normalizeDecimalText(initialValues.solution_ph_3),
    };
    const changedKeys = (Object.keys(normalizedValues) as (keyof FormValues)[])
      .filter((key) => normalizedValues[key] !== normalizedInitialValues[key]);
    const hasImage = Boolean(images.final_volume_image || images.solution_image);

    if (isEdit && changedKeys.length === 0 && !hasImage) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      if (hasImage) {
        const formData = new FormData();
        const keysToAppend = isEdit
          ? changedKeys
          : (Object.keys(normalizedValues) as (keyof FormValues)[]);

        keysToAppend.forEach((key) =>
          appendOptionalText(formData, key, normalizedValues[key]),
        );
        if (images.final_volume_image) {
          formData.append("final_volume_image", images.final_volume_image);
        }
        if (images.solution_image) {
          formData.append("solution_image", images.solution_image);
        }
        formData.set("checked_by_id", String(currentUser.id));

        if (isEdit) {
          await productionOrdersService.updatePostPreparationSolutionCheck(
            data!.id!,
            formData,
          );
        } else {
          await productionOrdersService.createPostPreparationSolutionCheck(
            productionOrderId!,
            formData,
          );
        }
      } else if (isEdit) {
        const payload = changedKeys.reduce<Record<string, string>>((acc, key) => {
          acc[key] = normalizedValues[key];
          return acc;
        }, {});
        payload.checked_by_id = String(currentUser.id);

        await productionOrdersService.updatePostPreparationSolutionCheck(
          data!.id!,
          payload,
        );
      } else {
        await productionOrdersService.createPostPreparationSolutionCheck(
          productionOrderId!,
          {
            ...normalizedValues,
            checked_by_id: currentUser.id,
          },
        );
      }

      toast.success(
        isEdit
          ? "Đã cập nhật kiểm tra dịch sau pha chế."
          : "Đã lưu kiểm tra dịch sau pha chế.",
      );
      if (isEdit && data?.id) {
        await mutate(
          API_ROUTES.productionOrders.postPreparationSolutionCheckDetail(
            data.id,
          ),
        );
      }
      if (checksKey) {
        await mutate(checksKey);
      }
      resetForm();
      onSaved?.();
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu kiểm tra dịch sau pha chế."),
      );
    }
  };

  const imagePicker = (
    field: ImageField,
    label: string,
    fileRef: React.RefObject<HTMLInputElement | null>,
    cameraRef: React.RefObject<HTMLInputElement | null>,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        ref={fileRef}
        key={`${field}-file-${fileInputKey}`}
        type="file"
        accept="image/*"
        disabled={isFormDisabled}
        className="sr-only"
        onChange={(event) => {
          selectImage(field, event.target.files);
          event.target.value = "";
        }}
      />
      <Input
        ref={cameraRef}
        key={`${field}-camera-${fileInputKey}`}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={isFormDisabled}
        className="sr-only"
        onChange={(event) => {
          selectImage(field, event.target.files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isFormDisabled}
          onClick={() => fileRef.current?.click()}
        >
          <ImageUp className="size-4" />
          Chọn file
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isFormDisabled}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="size-4" />
          Chụp ảnh
        </Button>
        {images[field] ? (
          <Button
            type="button"
            variant="outline"
            disabled={isFormDisabled}
            onClick={() =>
              setImages((current) => ({ ...current, [field]: null }))
            }
          >
            Bỏ ảnh
          </Button>
        ) : null}
      </div>
      {images[field] ? (
        <div className="rounded border bg-gray-50 p-2 text-xs text-gray-600">
          <p className="font-medium text-gray-700">Đã chọn 1 ảnh</p>
          <p className="mt-1 break-words">{images[field]?.name}</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            {isEdit
              ? "Cập nhật kiểm tra dịch sau pha chế"
              : "Kiểm tra dịch sau pha chế"}
          </p>

          <FormField
            control={form.control}
            name="solution_color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Màu sắc dung dịch</FormLabel>
                <FormControl>
                  <Input disabled={isFormDisabled} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="solution_clarity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Độ trong dung dịch</FormLabel>
                <FormControl>
                  <SolutionClarityToggle
                    value={field.value as SolutionClarityValue}
                    disabled={isFormDisabled}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            {(["solution_ph_1", "solution_ph_2", "solution_ph_3"] as const).map(
              (name, index) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>pH {index + 1}</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          disabled={isFormDisabled}
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ),
            )}
          </div>

          {imagePicker(
            "final_volume_image",
            "Ảnh thể tích cuối",
            finalVolumeFileRef,
            finalVolumeCameraRef,
          )}
          {imagePicker(
            "solution_image",
            "Ảnh dung dịch sau pha chế",
            solutionFileRef,
            solutionCameraRef,
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isFormDisabled}
              onClick={isEdit ? onClose : resetForm}
            >
              {isEdit ? "Hủy" : "Đặt lại"}
            </Button>
            <Button type="submit" disabled={isFormDisabled}>
              {form.formState.isSubmitting
                ? isEdit
                  ? "Đang cập nhật..."
                  : "Đang lưu..."
                : isEdit
                  ? "Cập nhật"
                  : "Lưu"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
