"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

type ProductOption = { value: string; label: string };

export default function ReportProductFilter({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: ProductOption[];
}) {
  const items = useMemo(
    () => [{ value: "all", label: "Tất cả" }, ...options],
    [options],
  );

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>Sản phẩm</Label>
      <Combobox
        autoHighlight
        items={items}
        value={items.find((item) => item.value === value) ?? null}
        onValueChange={(item) => onChange(item?.value ?? "all")}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.label}
        isItemEqualToValue={(item, selected) => item.value === selected.value}
      >
        <ComboboxInput
          id={id}
          className="w-full"
          placeholder="Tìm và chọn sản phẩm"
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>Không tìm thấy sản phẩm.</ComboboxEmpty>
          <ComboboxList>
            {(item: ProductOption) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
