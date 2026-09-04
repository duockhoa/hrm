"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";

const normalizeDecimalText = (value: string) => value.trim().replace(",", ".");

const toNumber = (value: string) => Number(normalizeDecimalText(value));

const WATER_DENSITY_G_PER_ML = 0.996;

const massText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${fieldLabel}`)
    .refine((value) => !Number.isNaN(toNumber(value)), {
      message: `${fieldLabel} không hợp lệ`,
    });

const formSchema = z
  .object({
    empty_pycnometer_mass_g: massText("khối lượng bình rỗng"),
    solution_pycnometer_mass_g: massText("khối lượng bình chứa dung dịch"),
    water_pycnometer_mass_g: massText("khối lượng bình chứa nước"),
  })
  .refine(
    (values) =>
      toNumber(values.solution_pycnometer_mass_g) >
      toNumber(values.empty_pycnometer_mass_g),
    {
      message: "Khối lượng bình chứa dung dịch phải lớn hơn bình rỗng",
      path: ["solution_pycnometer_mass_g"],
    },
  )
  .refine(
    (values) =>
      toNumber(values.water_pycnometer_mass_g) >
      toNumber(values.empty_pycnometer_mass_g),
    {
      message: "Khối lượng bình chứa nước phải lớn hơn bình rỗng",
      path: ["water_pycnometer_mass_g"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const densityFields = [
  "empty_pycnometer_mass_g",
  "solution_pycnometer_mass_g",
  "water_pycnometer_mass_g",
] as const;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const calculateDensity = (
  emptyMass: string,
  solutionMass: string,
  waterMass: string,
) => {
  if (!emptyMass || !solutionMass || !waterMass) {
    return null;
  }

  const empty = toNumber(emptyMass);
  const solution = toNumber(solutionMass);
  const water = toNumber(waterMass);

  if (
    Number.isNaN(empty) ||
    Number.isNaN(solution) ||
    Number.isNaN(water) ||
    water <= empty
  ) {
    return null;
  }

  const density = (solution - empty) / (water - empty);

  if (!Number.isFinite(density)) {
    return null;
  }

  return density;
};

const formatDensityPreview = (value: number | null) => {
  if (value === null) {
    return "";
  }

  return value.toLocaleString("vi-VN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
};

export default function FormProductionOrderDensityCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const densityChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.densityChecks(productionOrderId)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      empty_pycnometer_mass_g: "",
      solution_pycnometer_mass_g: "",
      water_pycnometer_mass_g: "",
    },
  });
  const [emptyMass, solutionMass, waterMass] = useWatch({
    control: form.control,
    name: densityFields,
  });
  const density = calculateDensity(emptyMass, solutionMass, waterMass);
  const apparentDensity =
    density === null ? null : density * WATER_DENSITY_G_PER_ML;
  const densityPreview = formatDensityPreview(density);
  const apparentDensityPreview = formatDensityPreview(apparentDensity);

  const onSubmit = async (values: FormValues) => {
    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const submittedDensity = calculateDensity(
      values.empty_pycnometer_mass_g,
      values.solution_pycnometer_mass_g,
      values.water_pycnometer_mass_g,
    );
    const submittedApparentDensity =
      submittedDensity === null
        ? null
        : submittedDensity * WATER_DENSITY_G_PER_ML;

    try {
      await productionOrdersService.createDensityCheck(productionOrderId, {
        empty_pycnometer_mass_g: normalizeDecimalText(
          values.empty_pycnometer_mass_g,
        ),
        solution_pycnometer_mass_g: normalizeDecimalText(
          values.solution_pycnometer_mass_g,
        ),
        water_pycnometer_mass_g: normalizeDecimalText(
          values.water_pycnometer_mass_g,
        ),
        ...(submittedApparentDensity === null
          ? {}
          : { apparent_density: submittedApparentDensity.toFixed(6) }),
      });

      toast.success("Đã lưu kiểm tra tỉ trọng.");
      form.reset({
        empty_pycnometer_mass_g: "",
        solution_pycnometer_mass_g: "",
        water_pycnometer_mass_g: "",
      });
      await mutate(densityChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể lưu kiểm tra tỉ trọng."));
      console.error("Error creating density check:", error);
    }
  };

  return (
    <div className="h-[100%] min-h-[300px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-[268px] flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <p className="text-center text-xl font-semibold uppercase text-gray-900">
              Kiểm tra tỉ trọng
            </p>

            <FormField
              control={form.control}
              name="empty_pycnometer_mass_g"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Khối lượng bình rỗng (g)</FormLabel>
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
              name="solution_pycnometer_mass_g"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Khối lượng bình chứa dung dịch (g)</FormLabel>
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
              name="water_pycnometer_mass_g"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <FormLabel>Khối lượng bình chứa nước (g)</FormLabel>
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

            <div className="space-y-2">
              <FormLabel>Tỉ trọng tính toán</FormLabel>
              <Input
                readOnly
                tabIndex={-1}
                value={densityPreview}
                className="bg-gray-50 font-semibold text-gray-900"
              />
              <p className="text-xs text-gray-500">
                (Khối lượng dịch - khối lượng rỗng) / (khối lượng nước - khối lượng rỗng)
              </p>
            </div>

            <div className="space-y-2">
              <FormLabel>Tỉ trọng biểu kiến (g/ml)</FormLabel>
              <Input
                readOnly
                tabIndex={-1}
                value={apparentDensityPreview}
                className="bg-gray-50 font-semibold text-gray-900"
              />
              <p className="text-xs text-gray-500">
                ((Khối lượng dịch - khối lượng rỗng) / (khối lượng nước - khối lượng rỗng)) * 0,996
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() =>
                form.reset({
                  empty_pycnometer_mass_g: "",
                  solution_pycnometer_mass_g: "",
                  water_pycnometer_mass_g: "",
                })
              }
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
