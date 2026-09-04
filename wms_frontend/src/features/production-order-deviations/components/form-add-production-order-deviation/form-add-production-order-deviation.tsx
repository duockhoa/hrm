"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ImageUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
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
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import { productionOrderDeviationsService } from "@/services/index.service";
import useUserStore from "@/store/user.store";
import useUsersStore from "@/store/users.store";

const MAX_DEVIATION_IMAGE_COUNT = 5;
const NO_APPROVER_VALUE = "none";

const formSchema = z.object({
  deviation_content: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập nội dung sai lệch"),
  handling_plan: z.string().trim().optional(),
  approver_id: z.string().optional(),
  deviation_images: z
    .custom<File[]>((value) => Array.isArray(value), {
      message: "Hình ảnh không hợp lệ",
    })
    .refine((files) => files.length <= MAX_DEVIATION_IMAGE_COUNT, {
      message: `Chỉ được chọn tối đa ${MAX_DEVIATION_IMAGE_COUNT} hình ảnh`,
    }),
});

type FormValues = z.infer<typeof formSchema>;

const getProductionOrderId = (productionOrder: any) =>
  productionOrder?.id ??
  productionOrder?.production_order_id ??
  productionOrder?.DocumentAbsoluteEntry;

const getUserLabel = (user: any) =>
  [user?.name, user?.username ?? user?.email].filter(Boolean).join(" - ");

const getUserSearchValue = (user: any) =>
  [user?.name, user?.username, user?.email].filter(Boolean).join(" ");

export default function FormAddProductionOrderDeviation({
  productionOrder,
  onClose,
}: {
  productionOrder: any;
  onClose?: () => void;
}) {
  const { user } = useUserStore();
  const { users } = useUsersStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const productionOrderId = getProductionOrderId(productionOrder);
  const approverOptions = users
    .filter((item) => item?.id !== user?.id)
    .map((item) => ({
      value: String(item.id),
      label: getUserLabel(item),
      searchValue: getUserSearchValue(item),
    }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deviation_content: "",
      handling_plan: "",
      approver_id: NO_APPROVER_VALUE,
      deviation_images: [],
    },
  });

  const refreshData = async () => {
    await Promise.all([
      mutate(API_ROUTES.productionOrderDeviations.base),
      productionOrderId
        ? mutate(
            `${API_ROUTES.productionOrderDeviations.base}?production_order_id=${productionOrderId}`,
          )
        : Promise.resolve(),
    ]);
  };

  const addImages = (files: FileList | null) => {
    const selectedImages = Array.from(files ?? []);

    if (selectedImages.length === 0) {
      return;
    }

    const nextImages = [
      ...form.getValues("deviation_images"),
      ...selectedImages,
    ];

    if (nextImages.length > MAX_DEVIATION_IMAGE_COUNT) {
      toast.error(`Chỉ được chọn tối đa ${MAX_DEVIATION_IMAGE_COUNT} hình ảnh.`);
    }

    form.setValue(
      "deviation_images",
      nextImages.slice(0, MAX_DEVIATION_IMAGE_COUNT),
      { shouldValidate: true },
    );
  };

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (!user?.id) {
      toast.error("Không tìm thấy người báo cáo.");
      return;
    }

    try {
      await productionOrderDeviationsService.createProductionOrderDeviation({
        production_order_id: productionOrderId,
        deviation_content: values.deviation_content,
        handling_plan: values.handling_plan?.trim() || null,
        reporter_id: user.id,
        approver_id:
          values.approver_id && values.approver_id !== NO_APPROVER_VALUE
            ? values.approver_id
            : undefined,
        deviation_images: values.deviation_images,
      });

      toast.success("Đã thêm sai lệch.");
      form.reset();
      await refreshData();
      onClose?.();
    } catch (error: any) {
      toast.error(error?.message || "Không thể thêm sai lệch.");
      console.error("Error creating production order deviation:", error);
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
              Thêm sai lệch
            </p>

            <FormField
              control={form.control}
              name="deviation_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung sai lệch</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-24 resize-y"
                      placeholder="Nhập nội dung sai lệch"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="handling_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phương án xử lý</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-24 resize-y"
                      placeholder="Nhập phương án xử lý"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Người phê duyệt</FormLabel>
                  <FormControl>
                    <Combobox
                      autoHighlight
                      items={approverOptions}
                      value={
                        approverOptions.find(
                          (option) => option.value === field.value,
                        ) ?? null
                      }
                      onValueChange={(option) => {
                        field.onChange(option?.value ?? NO_APPROVER_VALUE);
                      }}
                      itemToStringLabel={(item) => item.label}
                      itemToStringValue={(item) => item.searchValue}
                      isItemEqualToValue={(item, value) =>
                        item.value === value.value
                      }
                    >
                      <ComboboxInput
                        className="w-full"
                        placeholder="Tìm và chọn người phê duyệt"
                        showClear
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>
                          Không tìm thấy người phê duyệt.
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deviation_images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hình ảnh</FormLabel>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={form.formState.isSubmitting}
                    className="sr-only"
                    onChange={(event) => {
                      addImages(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <Input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={form.formState.isSubmitting}
                    className="sr-only"
                    onChange={(event) => {
                      addImages(event.target.files);
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
                  {field.value.length > 0 ? (
                    <div className="rounded border bg-gray-50 p-2 text-xs text-gray-600">
                      <p className="font-medium text-gray-700">
                        Đã chọn {field.value.length} ảnh
                      </p>
                    </div>
                  ) : null}
                  <p className="text-xs text-gray-500">
                    Tối đa {MAX_DEVIATION_IMAGE_COUNT} hình ảnh.
                  </p>
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
              onClick={() => form.reset()}
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
