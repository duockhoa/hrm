"use client";

import * as React from "react";
import { Camera, ImageUp } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderPostHomogenizationGranuleCheck } from "../../types";
import {
  formatCarrIndexPreview,
  normalizeDecimalText,
  toNumber,
} from "../../utils";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const decimalText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${fieldLabel}`)
    .refine((value) => !Number.isNaN(toNumber(value)), {
      message: `${fieldLabel} không hợp lệ`,
    })
    .refine((value) => toNumber(value) > 0, {
      message: `${fieldLabel} phải lớn hơn 0`,
    });

const optionalMoisturePercent = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{1,3}([,.]\d{1,2})?$/.test(value),
    { message: "Hàm ẩm tối đa 2 chữ số sau dấu phẩy" },
  )
  .refine(
    (value) => value === "" || (toNumber(value) >= 0 && toNumber(value) <= 100),
    { message: "Hàm ẩm phải nằm trong khoảng 0 đến 100" },
  );

const formSchema = z
  .object({
    bulk_density: decimalText("khối lượng riêng thô"),
    tapped_density: decimalText("khối lượng riêng gõ"),
    moisture_percent: optionalMoisturePercent,
  })
  .refine(
    (values) => toNumber(values.tapped_density) >= toNumber(values.bulk_density),
    {
      message:
        "Khối lượng riêng gõ phải lớn hơn hoặc bằng khối lượng riêng thô",
      path: ["tapped_density"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const toInputValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value).replace(".", ",");

const toFormValues = (
  data: ProductionOrderPostHomogenizationGranuleCheck,
): FormValues => ({
  bulk_density: toInputValue(data.bulk_density),
  tapped_density: toInputValue(data.tapped_density),
  moisture_percent: toInputValue(data.moisture_percent),
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditPostHomogenizationGranuleCheck({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderPostHomogenizationGranuleCheck;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const [image, setImage] = React.useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const initialValues = toFormValues(data);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const carrIndexPreview = formatCarrIndexPreview(
    form.watch("bulk_density"),
    form.watch("tapped_density"),
  );

  const selectImage = (files: FileList | null) => {
    const file = files?.[0] ?? null;

    if (!file) {
      setImage(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Ảnh chỉ nhận JPG, PNG, WEBP hoặc GIF.");
      setImage(null);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Ảnh tối đa 20MB.");
      setImage(null);
      return;
    }

    setImage(file);
  };

  const onSubmit = async (values: FormValues) => {
    if (data.id === undefined || data.id === null) {
      return;
    }

    const nextBulkDensity = normalizeDecimalText(values.bulk_density);
    const nextTappedDensity = normalizeDecimalText(values.tapped_density);
    const nextMoisturePercent =
      values.moisture_percent.trim() === ""
        ? ""
        : normalizeDecimalText(values.moisture_percent);
    const previousBulkDensity = normalizeDecimalText(initialValues.bulk_density);
    const previousTappedDensity = normalizeDecimalText(
      initialValues.tapped_density,
    );
    const previousMoisturePercent =
      initialValues.moisture_percent.trim() === ""
        ? ""
        : normalizeDecimalText(initialValues.moisture_percent);
    const hasBulkDensityChange = nextBulkDensity !== previousBulkDensity;
    const hasTappedDensityChange = nextTappedDensity !== previousTappedDensity;
    const hasMoisturePercentChange =
      nextMoisturePercent !== previousMoisturePercent;

    if (
      !hasBulkDensityChange &&
      !hasTappedDensityChange &&
      !hasMoisturePercentChange &&
      !image
    ) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      if (image) {
        const formData = new FormData();

        if (hasBulkDensityChange) {
          formData.append("bulk_density", nextBulkDensity);
        }
        if (hasTappedDensityChange) {
          formData.append("tapped_density", nextTappedDensity);
        }
        if (hasMoisturePercentChange) {
          formData.append("moisture_percent", nextMoisturePercent);
        }
        formData.append("granule_image", image);

        await productionOrdersService.updatePostHomogenizationGranuleCheck(
          data.id,
          formData,
        );
      } else {
        const payload: Record<string, string | null> = {};

        if (hasBulkDensityChange) {
          payload.bulk_density = nextBulkDensity;
        }
        if (hasTappedDensityChange) {
          payload.tapped_density = nextTappedDensity;
        }
        if (hasMoisturePercentChange) {
          payload.moisture_percent = nextMoisturePercent || null;
        }

        await productionOrdersService.updatePostHomogenizationGranuleCheck(
          data.id,
          payload,
        );
      }

      toast.success("Đã cập nhật kiểm tra cốm sau đồng nhất.");
      await mutate(
        API_ROUTES.productionOrders.postHomogenizationGranuleCheckDetail(
          data.id,
        ),
      );
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.postHomogenizationGranuleChecks(
            data.production_order_id,
          ),
        );
      }
      onSaved?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể cập nhật kiểm tra cốm sau đồng nhất.",
        ),
      );
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            Cập nhật kiểm tra cốm sau đồng nhất
          </p>

          <FormField
            control={form.control}
            name="bulk_density"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Khối lượng riêng thô (g/ml)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tapped_density"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Khối lượng riêng gõ (g/ml)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="moisture_percent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hàm ẩm (%)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="Ví dụ: 4,25" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Chỉ số Carr tính toán (%)</FormLabel>
            <Input
              readOnly
              tabIndex={-1}
              value={carrIndexPreview}
              className="bg-gray-50 font-semibold text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-post-homogenization-granule-image">
              Ảnh mới
            </Label>
            <Input
              ref={fileInputRef}
              key={fileInputKey}
              id="edit-post-homogenization-granule-image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                selectImage(event.target.files);
                event.target.value = "";
              }}
            />
            <Input
              ref={cameraInputRef}
              key={`camera-${fileInputKey}`}
              id="capture-edit-post-homogenization-granule-image"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                selectImage(event.target.files);
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageUp className="size-4" />
                Chọn file
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="size-4" />
                Chụp ảnh
              </Button>
              {image ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImage(null);
                    setFileInputKey((key) => key + 1);
                  }}
                >
                  Bỏ ảnh
                </Button>
              ) : null}
            </div>
            {image ? (
              <div className="rounded border bg-gray-50 p-2 text-xs text-gray-600">
                <p className="font-medium text-gray-700">Đã chọn 1 ảnh</p>
                <p className="mt-1 break-words">{image.name}</p>
              </div>
            ) : null}
            <p className="text-xs text-gray-500">
              Nếu chọn ảnh mới, ảnh cũ sẽ được thay thế.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
