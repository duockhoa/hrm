"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import productionOrdersService from "@/services/product-orders.service";

const formSchema = z.object({
  location: z.string().trim().min(1, "Vui lòng nhập vị trí lấy mẫu"),
});

type FormValues = z.infer<typeof formSchema>;

export default function FormCreateSamplingRequest({
  productionOrderId,
  onClose,
  onCreated,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
  onCreated?: () => Promise<void> | void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    try {
      await productionOrdersService.createSamplingRequest(productionOrderId, {
        location: values.location,
      });

      toast.success("Đã tạo phiếu yêu cầu lấy mẫu.");
      form.reset();
      try {
        await onCreated?.();
      } catch (refreshError) {
        console.error("Error refreshing sampling request data:", refreshError);
      }
      onClose?.();
    } catch (error: any) {
      toast.error(error?.message || "Không thể tạo phiếu yêu cầu lấy mẫu.");
      console.error("Error creating sampling request:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[240px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[208px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Tạo yêu cầu lấy mẫu
            </p>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vị trí</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập vị trí lấy mẫu"
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
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
              {form.formState.isSubmitting ? "Đang tạo..." : "Tạo"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
