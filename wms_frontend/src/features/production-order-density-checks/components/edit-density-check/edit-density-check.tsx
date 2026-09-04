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

type DensityField =
  | "empty_pycnometer_mass_g"
  | "solution_pycnometer_mass_g"
  | "water_pycnometer_mass_g";

type DensityCheck = {
  id?: string | number;
  production_order_id?: string | number | null;
  empty_pycnometer_mass_g?: string | number | null;
  solution_pycnometer_mass_g?: string | number | null;
  water_pycnometer_mass_g?: string | number | null;
  apparent_density?: string | number | null;
};

const WATER_DENSITY_G_PER_ML = 0.996;

const fields: DensityField[] = [
  "empty_pycnometer_mass_g",
  "solution_pycnometer_mass_g",
  "water_pycnometer_mass_g",
];
const normalizeDecimalText = (value: string) => value.trim().replace(",", ".");
const toNumber = (value: string) => Number(normalizeDecimalText(value));
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

  return Number.isFinite(density) ? density : null;
};
const massText = (label: string) =>
  z.string().trim().min(1, `Vui lòng nhập ${label}`).refine(
    (value) => Number.isFinite(toNumber(value)),
    `${label} không hợp lệ`,
  );
const formSchema = z
  .object({
    empty_pycnometer_mass_g: massText("khối lượng bình rỗng"),
    solution_pycnometer_mass_g: massText("khối lượng bình chứa dung dịch"),
    water_pycnometer_mass_g: massText("khối lượng bình chứa nước"),
  })
  .refine(
    (value) =>
      toNumber(value.solution_pycnometer_mass_g) >
      toNumber(value.empty_pycnometer_mass_g),
    {
      path: ["solution_pycnometer_mass_g"],
      message: "Khối lượng bình chứa dung dịch phải lớn hơn bình rỗng",
    },
  )
  .refine(
    (value) =>
      toNumber(value.water_pycnometer_mass_g) >
      toNumber(value.empty_pycnometer_mass_g),
    {
      path: ["water_pycnometer_mass_g"],
      message: "Khối lượng bình chứa nước phải lớn hơn bình rỗng",
    },
  );
type FormValues = z.infer<typeof formSchema>;

const toFormValues = (data: DensityCheck): FormValues => ({
  empty_pycnometer_mass_g: String(data.empty_pycnometer_mass_g ?? ""),
  solution_pycnometer_mass_g: String(data.solution_pycnometer_mass_g ?? ""),
  water_pycnometer_mass_g: String(data.water_pycnometer_mass_g ?? ""),
});
const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function EditDensityCheck({
  data,
  onCancel,
  onSaved,
}: {
  data: DensityCheck;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const initialValues = toFormValues(data);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });
  const [empty, solution, water] = useWatch({
    control: form.control,
    name: fields,
  });
  const density = calculateDensity(empty, solution, water);
  const apparentDensity =
    density === null ? null : density * WATER_DENSITY_G_PER_ML;

  const onSubmit = async (values: FormValues) => {
    if (data.id === undefined || data.id === null) return;

    const payload: Partial<Record<DensityField | "apparent_density", string>> =
      {};
    fields.forEach((field) => {
      const nextValue = normalizeDecimalText(values[field]);
      const previousValue = normalizeDecimalText(initialValues[field]);
      if (nextValue !== previousValue) payload[field] = nextValue;
    });
    const nextDensity = calculateDensity(
      values.empty_pycnometer_mass_g,
      values.solution_pycnometer_mass_g,
      values.water_pycnometer_mass_g,
    );
    const nextApparentDensity =
      nextDensity === null
        ? null
        : (nextDensity * WATER_DENSITY_G_PER_ML).toFixed(6);
    const previousApparentDensity =
      data.apparent_density === null || data.apparent_density === undefined
        ? null
        : Number(data.apparent_density).toFixed(6);

    if (
      nextApparentDensity !== null &&
      (Object.keys(payload).length > 0 ||
        nextApparentDensity !== previousApparentDensity)
    ) {
      payload.apparent_density = nextApparentDensity;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      await productionOrdersService.updateDensityCheck(data.id, payload);
      toast.success("Đã cập nhật kiểm tra tỉ trọng.");
      await mutate(API_ROUTES.productionOrders.densityCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.densityChecks(data.production_order_id),
        );
      }
      onSaved?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể cập nhật kiểm tra tỉ trọng."));
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            Cập nhật kiểm tra tỉ trọng
          </p>
          {fields.map((name) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {name === "empty_pycnometer_mass_g"
                      ? "Khối lượng bình rỗng (g)"
                      : name === "solution_pycnometer_mass_g"
                        ? "Khối lượng bình chứa dung dịch (g)"
                        : "Khối lượng bình chứa nước (g)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormItem>
            <FormLabel>Tỉ trọng tính toán</FormLabel>
            <Input
              readOnly
              tabIndex={-1}
              value={density === null ? "" : density.toFixed(4)}
              className="bg-gray-50 font-semibold"
            />
          </FormItem>
          <FormItem>
            <FormLabel>Tỉ trọng biểu kiến (g/ml)</FormLabel>
            <Input
              readOnly
              tabIndex={-1}
              value={apparentDensity === null ? "" : apparentDensity.toFixed(4)}
              className="bg-gray-50 font-semibold"
            />
          </FormItem>
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
