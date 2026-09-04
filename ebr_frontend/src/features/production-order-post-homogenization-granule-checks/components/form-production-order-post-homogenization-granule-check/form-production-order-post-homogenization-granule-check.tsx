"use client";

import * as React from "react";
import { Camera, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
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

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderPostHomogenizationGranuleCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const [image, setImage] = React.useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const checksKey = productionOrderId
    ? API_ROUTES.productionOrders.postHomogenizationGranuleChecks(
        productionOrderId,
      )
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bulk_density: "",
      tapped_density: "",
      moisture_percent: "",
    },
  });

  const carrIndexPreview = formatCarrIndexPreview(
    form.watch("bulk_density"),
    form.watch("tapped_density"),
  );

  const resetForm = () => {
    form.reset({
      bulk_density: "",
      tapped_density: "",
      moisture_percent: "",
    });
    setImage(null);
    setFileInputKey((key) => key + 1);
  };

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
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    try {
      if (image) {
        const formData = new FormData();

        formData.append("bulk_density", normalizeDecimalText(values.bulk_density));
        formData.append(
          "tapped_density",
          normalizeDecimalText(values.tapped_density),
        );
        formData.append(
          "moisture_percent",
          values.moisture_percent.trim() === ""
            ? ""
            : normalizeDecimalText(values.moisture_percent),
        );
        formData.append("granule_image", image);

        await productionOrdersService.createPostHomogenizationGranuleCheck(
          productionOrderId,
          formData,
        );
      } else {
        await productionOrdersService.createPostHomogenizationGranuleCheck(
          productionOrderId,
          {
            bulk_density: normalizeDecimalText(values.bulk_density),
            tapped_density: normalizeDecimalText(values.tapped_density),
            moisture_percent:
              values.moisture_percent.trim() === ""
                ? null
                : normalizeDecimalText(values.moisture_percent),
          },
        );
      }

      toast.success("Đã lưu kiểm tra cốm sau đồng nhất.");
      resetForm();
      await mutate(checksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể lưu kiểm tra cốm sau đồng nhất.",
        ),
      );
      console.error("Error creating post-homogenization granule check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[420px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[388px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Kiểm tra cốm sau đồng nhất
            </p>

            <FormField
              control={form.control}
              name="bulk_density"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Khối lượng riêng thô (g/ml)</FormLabel>
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
              name="tapped_density"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Khối lượng riêng gõ (g/ml)</FormLabel>
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
              name="moisture_percent"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Hàm ẩm (%)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        disabled={form.formState.isSubmitting}
                        placeholder="Ví dụ: 4,25"
                        {...field}
                      />
                    </FormControl>
                  </div>
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
              <p className="text-xs text-gray-500">
                Backend sẽ tự tính và lưu theo công thức ((gõ - thô) / gõ) *
                100.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-homogenization-granule-image">Ảnh</Label>
              <Input
                ref={fileInputRef}
                key={fileInputKey}
                id="post-homogenization-granule-image"
                type="file"
                accept="image/*"
                disabled={form.formState.isSubmitting}
                className="sr-only"
                onChange={(event) => {
                  selectImage(event.target.files);
                  event.target.value = "";
                }}
              />
              <Input
                ref={cameraInputRef}
                key={`camera-${fileInputKey}`}
                id="capture-post-homogenization-granule-image"
                type="file"
                accept="image/*"
                capture="environment"
                disabled={form.formState.isSubmitting}
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
                  disabled={form.formState.isSubmitting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageUp className="size-4" />
                  Chọn file
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={form.formState.isSubmitting}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="size-4" />
                  Chụp ảnh
                </Button>
              </div>
              {image ? (
                <div className="rounded border bg-gray-50 p-2 text-xs text-gray-600">
                  <p className="font-medium text-gray-700">Đã chọn 1 ảnh</p>
                  <p className="mt-1 break-words">{image.name}</p>
                </div>
              ) : null}
              <p className="text-xs text-gray-500">
                Chỉ chọn 1 ảnh, tối đa 20MB.
              </p>
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
