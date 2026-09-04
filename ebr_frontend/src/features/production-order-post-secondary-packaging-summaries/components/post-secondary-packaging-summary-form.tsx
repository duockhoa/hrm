"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useId, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import * as z from "zod";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import productionOrdersService from "@/services/product-orders.service";
import type {
  PostSecondaryPackagingSummary,
  SummaryProductionOrder,
} from "../types";
import { getErrorMessage, getSummaryOrder } from "../utils";

const COMMON_UNIT_OPTIONS = [
  "kg",
  "g",
  "hộp",
  "vỉ",
  "lọ",
  "viên",
  "gói",
  "chai",
  "ống",
] as const;

const nonNegativeDecimalText = z
  .string()
  .trim()
  .min(1, "Số lượng tồn là bắt buộc")
  .refine((value) => /^\d+(?:[.,]\d{1,3})?$/.test(value), {
    message: "Số lượng tồn phải là số không âm, tối đa 3 chữ số thập phân",
  });

const formSchema = z.object({
  semi_finished_product_order_id: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn lệnh sản xuất bán thành phẩm"),
  received_bag_count: z
    .string()
    .trim()
    .min(1, "Số tải nhận là bắt buộc")
    .regex(/^\d+$/, "Số tải nhận phải là số nguyên không âm"),
  remaining_quantity: nonNegativeDecimalText,
  unit: z.string().trim().max(20, "Đơn vị tính tối đa 20 ký tự"),
  remaining_reason: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

type OrderOption = {
  value: string;
  label: string;
  searchValue: string;
  productCode: string;
  productName: string;
  lotNo: string;
  orderCode: string;
};

const displayValue = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const toOrderOption = (order: SummaryProductionOrder): OrderOption => {
  const productCode = displayValue(order.item?.item_code ?? order.item_code);
  const productName = displayValue(order.item?.item_name ?? order.description);
  const lotNo = displayValue(order.lot_no);
  const orderCode = displayValue(order.production_order_code ?? order.id);
  const label = `${productName} - ${lotNo} | ${orderCode} - ${productCode}`;

  return {
    value: String(order.id),
    label,
    productCode,
    productName,
    lotNo,
    orderCode,
    searchValue: `${orderCode} ${lotNo} ${productCode} ${productName} ${order.id}`,
  };
};

export default function PostSecondaryPackagingSummaryForm({
  productionOrderId,
  data,
  usedSemiFinishedOrderIds = [],
  onSaved,
  onCancel,
}: {
  productionOrderId: string | number;
  data?: PostSecondaryPackagingSummary | null;
  usedSemiFinishedOrderIds?: Array<string | number>;
  onSaved?: (summary: PostSecondaryPackagingSummary) => void;
  onCancel?: () => void;
}) {
  const unitOptionsId = useId();
  const comboboxPortalContainerRef = useRef<HTMLElement | null>(null);
  const setFormContainerRef = useCallback((node: HTMLFormElement | null) => {
    comboboxPortalContainerRef.current =
      node?.closest<HTMLElement>('[data-slot="dialog-content"]') ?? null;
  }, []);
  const isEditing = data?.id !== null && data?.id !== undefined;
  const listKey =
    API_ROUTES.productionOrders.postSecondaryPackagingSummaries(
      productionOrderId,
    );
  const { data: semiFinishedOrders = [], isLoading: isLoadingOrders } = useSWR<
    SummaryProductionOrder[]
  >(
    API_ROUTES.productionOrders.semiFinishedProducts,
    productionOrdersService.fetchSemiFinishedProducts,
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      semi_finished_product_order_id: String(
        data?.semi_finished_product_order_id ?? "",
      ),
      received_bag_count: String(data?.received_bag_count ?? ""),
      remaining_quantity: String(data?.remaining_quantity ?? ""),
      unit: data?.unit ?? "",
      remaining_reason: data?.remaining_reason ?? "",
    },
  });

  const options = useMemo<OrderOption[]>(() => {
    const usedIds = new Set(usedSemiFinishedOrderIds.map(String));
    const selectedId = String(data?.semi_finished_product_order_id ?? "");

    return semiFinishedOrders
      .filter((order) => {
        if (order.id === null || order.id === undefined) return false;
        const orderId = String(order.id);
        return (
          orderId !== String(productionOrderId) &&
          (!usedIds.has(orderId) || orderId === selectedId)
        );
      })
      .map(toOrderOption);
  }, [
    data?.semi_finished_product_order_id,
    productionOrderId,
    semiFinishedOrders,
    usedSemiFinishedOrderIds,
  ]);

  const selectedValue = useWatch({
    control: form.control,
    name: "semi_finished_product_order_id",
  });
  const fallbackSelectedOrder = getSummaryOrder(data ?? {});
  const selectedOption =
    options.find((option) => option.value === selectedValue) ??
    (fallbackSelectedOrder?.id !== null &&
    fallbackSelectedOrder?.id !== undefined &&
    String(fallbackSelectedOrder.id) === selectedValue
      ? toOrderOption(fallbackSelectedOrder)
      : null);

  const submit = async (values: FormValues) => {
    const payload = {
      semi_finished_product_order_id: values.semi_finished_product_order_id,
      received_bag_count: Number(values.received_bag_count),
      remaining_quantity: values.remaining_quantity.replace(",", "."),
      unit: values.unit.trim() || null,
      remaining_reason: values.remaining_reason.trim() || null,
    };

    try {
      let savedSummary: PostSecondaryPackagingSummary;

      if (isEditing && data?.id !== null && data?.id !== undefined) {
        savedSummary =
          await productionOrdersService.updatePostSecondaryPackagingSummary(
            data.id,
            payload,
          );
        toast.success("Đã cập nhật tổng kết BTP hoàn thiện.");
      } else {
        savedSummary =
          await productionOrdersService.createPostSecondaryPackagingSummary(
            productionOrderId,
            payload,
          );
        toast.success("Đã tạo tổng kết BTP hoàn thiện.");
      }

      if (savedSummary.id !== null && savedSummary.id !== undefined) {
        await mutate(
          API_ROUTES.productionOrders.postSecondaryPackagingSummaryDetail(
            savedSummary.id,
          ),
          savedSummary,
          { revalidate: false },
        );
      }

      void mutate(listKey);
      onSaved?.(savedSummary);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Không thể lưu tổng kết BTP hoàn thiện."),
      );
    }
  };

  return (
    <Form {...form}>
      <form
        ref={setFormContainerRef}
        onSubmit={form.handleSubmit(submit)}
        className="space-y-5"
      >
        <div className="space-y-1 text-center">
          <h3 className="text-lg font-semibold">
            {isEditing
              ? "Cập nhật tổng kết BTP hoàn thiện"
              : "Thêm tổng kết BTP hoàn thiện"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Mỗi lô BTP chỉ được tổng kết một lần trong lô thành phẩm này.
          </p>
        </div>

        <FormField
          control={form.control}
          name="semi_finished_product_order_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lệnh sản xuất bán thành phẩm *</FormLabel>
              <FormControl>
                <Combobox
                  autoHighlight
                  items={options}
                  value={selectedOption}
                  onValueChange={(option) =>
                    field.onChange(option?.value ?? "")
                  }
                  itemToStringLabel={(item) => item.label}
                  itemToStringValue={(item) => item.searchValue}
                  isItemEqualToValue={(item, selected) =>
                    item.value === selected.value
                  }
                >
                  <ComboboxInput
                    className="w-full"
                    disabled={form.formState.isSubmitting || isLoadingOrders}
                    placeholder={
                      isLoadingOrders
                        ? "Đang tải danh sách..."
                        : "Tìm theo mã lệnh, mã hàng hoặc tên BTP"
                    }
                    showClear
                  />
                  <ComboboxContent portalContainer={comboboxPortalContainerRef}>
                    <ComboboxEmpty>Không có lệnh BTP phù hợp.</ComboboxEmpty>
                    <ComboboxList>
                      {(option) => (
                        <ComboboxItem key={option.value} value={option}>
                          <div className="min-w-0 py-0.5">
                            <p className="truncate font-medium">
                              {option.productName} - {option.lotNo}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              Mã lệnh: {option.orderCode} - Mã thành phẩm:{" "}
                              {option.productCode}
                            </p>
                          </div>
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

        {selectedOption ? (
          <div className="space-y-1.5 rounded-md border bg-slate-50 p-4">
            <p className="break-words text-sm font-semibold text-slate-900">
              {selectedOption.productName} - {selectedOption.lotNo}
            </p>
            <p className="break-words text-xs text-muted-foreground">
              Mã lệnh: {selectedOption.orderCode} - Mã thành phẩm:{" "}
              {selectedOption.productCode}
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="received_bag_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số tải nhận *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="remaining_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số lượng tồn *</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Đơn vị tính</FormLabel>
                <FormControl>
                  <Input
                    list={unitOptionsId}
                    maxLength={20}
                    placeholder="Chọn hoặc nhập đơn vị"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <datalist id={unitOptionsId}>
                  {COMMON_UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="remaining_reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lý do tồn</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isSubmitting}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Đang lưu..."
              : isEditing
                ? "Lưu thay đổi"
                : "Tạo bản tổng kết"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
