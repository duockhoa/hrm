"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";

type ProductionOrderLot = {
  id?: string | number;
  lot_no?: string | number | null;
  production_order_code?: string | null;
  creation_date?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  date_manufacture?: string | null;
  item?: { item_name?: string | null } | null;
};

type LotOption = {
  value: string;
  label: string;
  searchValue: string;
};

const getOrderDate = (order: ProductionOrderLot) =>
  order.creation_date ??
  order.created_at ??
  order.start_date ??
  order.date_manufacture;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN").format(new Date(value));

export default function RecentProductionOrderSelect({
  value,
  currentProductionOrderId,
  disabled,
  onChange,
}: {
  value: string;
  currentProductionOrderId: string | number;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { data = [], isLoading, error } = useSWR<ProductionOrderLot[]>(
    API_ROUTES.productionOrders.base,
    productionOrdersService.fetchProductionOrders,
  );

  const options = useMemo<LotOption[]>(() => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return data
      .filter((order) => {
        if (
          order.id === null ||
          order.id === undefined ||
          String(order.id) === String(currentProductionOrderId) ||
          order.lot_no === null ||
          order.lot_no === undefined ||
          order.lot_no === ""
        ) {
          return false;
        }

        const rawDate = getOrderDate(order);
        if (!rawDate) return false;
        const orderDate = new Date(rawDate);
        return (
          !Number.isNaN(orderDate.getTime()) &&
          orderDate >= oneMonthAgo &&
          orderDate <= now
        );
      })
      .sort(
        (first, second) =>
          new Date(getOrderDate(second)!).getTime() -
          new Date(getOrderDate(first)!).getTime(),
      )
      .map((order) => {
        const rawDate = getOrderDate(order)!;
        const parts = [
          `Lô ${order.lot_no}`,
          order.production_order_code,
          order.item?.item_name,
          formatDate(rawDate),
        ].filter(Boolean);
        const label = parts.join(" · ");

        return {
          value: String(order.id),
          label,
          searchValue: `${order.lot_no} ${order.production_order_code ?? ""} ${order.item?.item_name ?? ""}`,
        };
      });
  }, [currentProductionOrderId, data]);

  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <div className="space-y-2">
      <Combobox
        autoHighlight
        items={options}
        value={selectedOption}
        onValueChange={(option) => onChange(option?.value ?? "")}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.searchValue}
        isItemEqualToValue={(item, selected) => item.value === selected.value}
      >
        <ComboboxInput
          className="w-full"
          disabled={disabled || isLoading}
          placeholder={isLoading ? "Đang tải danh sách lô..." : "Tìm và chọn lô sản xuất trước"}
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>Không có lô nào trong 1 tháng gần nhất.</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.value} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error ? (
        <p className="text-sm text-destructive">Không thể tải danh sách lô sản xuất.</p>
      ) : null}
    </div>
  );
}
