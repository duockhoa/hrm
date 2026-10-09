"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeSearchText } from "@/lib/search-utils";
import { API_ROUTES } from "@/lib/api-routes";
import manufacturersService from "@/services/manufacturers.service";
import useRawMaterialsStore, {
  type RawMaterialOption,
} from "@/store/raw-materials.store";
import businessPartnersService, {
  SUPPLIERS_URL,
} from "@/services/business-partners.service";
import warehouseReceiptItemsService, {
  type WarehouseReceiptItem,
  type WarehouseReceiptItemPayload,
} from "@/services/warehouse-receipt-items.service";

export function receiptError(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    if (error.response?.status === 403)
      return "Bạn không có quyền thực hiện thao tác này.";
    if (error.response?.status === 404)
      return "Không tìm thấy bản ghi hàng nhập kho.";
    const message = error.response?.data?.message;
    if (message === "quantity is required") return "Vui lòng nhập số lượng.";
    if (message === "supplier_code is required")
      return "Vui lòng chọn nhà cung cấp.";
    if (message === "Supplier does not exist or is not a supplier")
      return "Vui lòng chọn nhà cung cấp hợp lệ trong danh sách.";
    if (message === "Manufacturer does not exist")
      return "Nhà sản xuất không còn tồn tại. Vui lòng chọn lại trong danh sách.";
    if (typeof message === "string" && message.startsWith("quantity ")) {
      return "Số lượng phải lớn hơn 0, không vượt quá 999.999.999,999 và có tối đa 3 chữ số thập phân.";
    }
    if (Array.isArray(message)) return message.join("; ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

const textFields = [
  ["manufacturer_lot_number", "Số lô nhà sản xuất", 100, false],
  ["lot_number", "Số lô", 100, true],
  ["packaging_specification", "Quy cách đóng gói", 255, false],
  ["supplier_code", "Nhà cung cấp", 191, true],
  ["manufacturer_code", "Nhà sản xuất", 100, false],
] as const;

function defaultLotNumber(manufacturerLotNumber: string, date: Date) {
  const lot = manufacturerLotNumber.trim();
  if (!lot) return "";
  const dateSuffix = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
    .format(date)
    .replaceAll("/", "");
  return `${lot}-${dateSuffix}`;
}

export default function ReceiptForm({
  data,
  onCancel,
  onSaved,
}: {
  data?: WarehouseReceiptItem;
  onCancel: () => void;
  onSaved: (receipt: WarehouseReceiptItem) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [itemCode, setItemCode] = useState(data?.item_code ?? "");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const filterItems = useCallback(
    (item: RawMaterialOption) => item.searchText.includes(itemSearchQuery),
    [itemSearchQuery],
  );
  const [manufacturerLotNumber, setManufacturerLotNumber] = useState(
    data?.manufacturer_lot_number ?? "",
  );
  const [manualLotNumber, setManualLotNumber] = useState<string | null>(
    data?.lot_number ?? null,
  );
  const [formCreatedAt] = useState(() => new Date());
  const lotNumber =
    manualLotNumber ?? defaultLotNumber(manufacturerLotNumber, formCreatedAt);
  const itemOptions = useRawMaterialsStore((state) => state.itemOptions);
  const items = useRawMaterialsStore((state) => state.items);
  const unit =
    (itemCode === data?.item_code ? data.unit : null) ??
    items.find((item) => item.item_code === itemCode)?.unit ??
    (itemCode === data?.item_code ? data.item?.unit : "") ??
    "";
  const itemsStatus = useRawMaterialsStore((state) => state.status);
  const itemsLoading = itemsStatus === "idle" || itemsStatus === "loading";
  const [supplierCode, setSupplierCode] = useState(data?.supplier_code ?? "");
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const {
    data: suppliers,
    error: suppliersError,
    isLoading: suppliersLoading,
    mutate: reloadSuppliers,
  } = useSWR(SUPPLIERS_URL, businessPartnersService.listSuppliers);
  const supplierOptions = useMemo(
    () =>
      (suppliers ?? []).map((supplier) => {
        const label = `${supplier.card_name} (${supplier.card_code})`;
        return {
          value: supplier.card_code,
          label,
          searchText: normalizeSearchText(label),
        };
      }),
    [suppliers],
  );
  const filterSuppliers = useCallback(
    (supplier: RawMaterialOption) =>
      supplier.searchText.includes(supplierSearchQuery),
    [supplierSearchQuery],
  );
  const [manufacturerCode, setManufacturerCode] = useState(
    data?.manufacturer_code ?? "",
  );
  const [manufacturerSearchQuery, setManufacturerSearchQuery] = useState("");
  const {
    data: manufacturers,
    error: manufacturersError,
    isLoading: manufacturersLoading,
    mutate: reloadManufacturers,
  } = useSWR(API_ROUTES.manufacturers.base, manufacturersService.fetchAll);
  const manufacturerOptions = useMemo(
    () =>
      (manufacturers ?? []).map((manufacturer) => {
        const label = `${manufacturer.manufacturer_name} (${manufacturer.manufacturer_code})`;
        return {
          value: manufacturer.manufacturer_code,
          label,
          searchText: normalizeSearchText(label),
        };
      }),
    [manufacturers],
  );
  const filterManufacturers = useCallback(
    (manufacturer: RawMaterialOption) =>
      manufacturer.searchText.includes(manufacturerSearchQuery),
    [manufacturerSearchQuery],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    const quantity = text("quantity");
    if (!quantity) {
      setError("Vui lòng nhập số lượng.");
      return;
    }
    if (
      !/^\d+(?:\.\d{1,3})?$/.test(quantity) ||
      Number(quantity) <= 0 ||
      Number(quantity) > 999999999.999
    ) {
      setError(
        "Số lượng phải lớn hơn 0, không vượt quá 999.999.999,999 và có tối đa 3 chữ số thập phân.",
      );
      return;
    }
    if (!supplierCode.trim()) {
      setError("Vui lòng chọn nhà cung cấp.");
      return;
    }
    const note = text("note");
    if (new TextEncoder().encode(note).length > 65535) {
      setError("Ghi chú vượt quá giới hạn 65535 byte UTF-8.");
      return;
    }
    const payload: WarehouseReceiptItemPayload = {
      item_code: itemCode,
      quantity,
      unit: unit.trim() || null,
      lot_number: (
        manualLotNumber ?? defaultLotNumber(manufacturerLotNumber, new Date())
      ).trim(),
      manufacturer_lot_number: text("manufacturer_lot_number") || null,
      packaging_specification: text("packaging_specification") || null,
      supplier_code: supplierCode,
      manufacturer_code: manufacturerCode || null,
      expiry_date: text("expiry_date") || null,
      note: note || null,
    };
    if (!itemOptions.some((item) => item.value === itemCode)) {
      setError("Vui lòng chọn mã hàng trong danh sách.");
      return;
    }
    if (
      supplierCode !== data?.supplier_code &&
      !supplierOptions.some((supplier) => supplier.value === supplierCode)
    ) {
      setError("Vui lòng chọn nhà cung cấp trong danh sách.");
      return;
    }
    if (
      manufacturerCode &&
      manufacturerCode !== data?.manufacturer_code &&
      !manufacturerOptions.some(
        (manufacturer) => manufacturer.value === manufacturerCode,
      )
    ) {
      setError("Vui lòng chọn nhà sản xuất trong danh sách.");
      return;
    }
    if (!payload.lot_number) {
      setError("Vui lòng nhập số lô.");
      return;
    }
    if (payload.lot_number.length > 100) {
      setError("Số lô không được vượt quá 100 ký tự.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      const changes = data
        ? Object.fromEntries(
            Object.entries(payload).filter(
              ([key, value]) =>
                value !==
                (key === "expiry_date"
                  ? (data.expiry_date?.slice(0, 10) ?? null)
                  : key === "quantity"
                    ? data.quantity == null
                      ? null
                      : String(data.quantity)
                    : data[key as keyof WarehouseReceiptItem]),
            ),
          )
        : payload;
      if (data && Object.keys(changes).length === 0) {
        onCancel();
        return;
      }
      const saved = data
        ? await warehouseReceiptItemsService.update(data.id, changes)
        : await warehouseReceiptItemsService.create(payload);
      toast.success(
        data ? "Đã cập nhật hàng nhập kho." : "Đã thêm hàng nhập kho.",
      );
      onSaved(saved);
    } catch (error) {
      setError(receiptError(error, "Không thể lưu hàng nhập kho."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={isSubmitting} className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="receipt-item-code">Mã hàng *</Label>
          <Combobox
            autoHighlight
            items={itemOptions}
            limit={50}
            onInputValueChange={(query) =>
              setItemSearchQuery(normalizeSearchText(query).trim())
            }
            value={itemOptions.find((item) => item.value === itemCode) ?? null}
            onValueChange={(item) => {
              setItemCode(item?.value ?? "");
              setError("");
            }}
            itemToStringLabel={(item) => item.label}
            itemToStringValue={(item) => item.value}
            isItemEqualToValue={(item, value) => item.value === value.value}
            filter={filterItems}
            disabled={isSubmitting || itemsLoading}
          >
            <ComboboxInput
              id="receipt-item-code"
              className="w-full"
              placeholder={
                itemsLoading
                  ? "Đang tải danh sách hàng..."
                  : "Gõ tên hoặc mã hàng để chọn"
              }
              disabled={isSubmitting || itemsLoading}
              showClear
            />
            <ComboboxContent portalContainer={formRef}>
              <ComboboxEmpty>Không tìm thấy hàng phù hợp.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item.value} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {itemsStatus === "error" && (
            <div role="alert" className="text-sm text-red-600">
              Không thể tải danh sách hàng.
              <Button
                type="button"
                variant="link"
                disabled={isSubmitting}
                onClick={() => window.location.reload()}
              >
                Tải lại ứng dụng
              </Button>
            </div>
          )}
        </div>
        {textFields.map(([key, label, maxLength, required]) =>
          key === "supplier_code" ? (
            <div key={key} className="space-y-2">
              <Label htmlFor="receipt-supplier-code">Nhà cung cấp *</Label>
              <Combobox
                autoHighlight
                items={supplierOptions}
                limit={50}
                onInputValueChange={(query) =>
                  setSupplierSearchQuery(normalizeSearchText(query).trim())
                }
                value={
                  supplierOptions.find(
                    (supplier) => supplier.value === supplierCode,
                  ) ?? null
                }
                onValueChange={(supplier) => {
                  setSupplierCode(supplier?.value ?? "");
                  setError("");
                }}
                itemToStringLabel={(supplier) => supplier.label}
                itemToStringValue={(supplier) => supplier.value}
                isItemEqualToValue={(supplier, value) =>
                  supplier.value === value.value
                }
                filter={filterSuppliers}
                disabled={isSubmitting || suppliersLoading || !!suppliersError}
              >
                <ComboboxInput
                  id="receipt-supplier-code"
                  aria-required="true"
                  className="w-full"
                  placeholder={
                    suppliersLoading
                      ? "Đang tải danh sách nhà cung cấp..."
                      : "Gõ tên hoặc mã nhà cung cấp để chọn"
                  }
                  disabled={
                    isSubmitting || suppliersLoading || !!suppliersError
                  }
                  showClear
                />
                <ComboboxContent portalContainer={formRef}>
                  <ComboboxEmpty>
                    Không tìm thấy nhà cung cấp phù hợp.
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(supplier) => (
                      <ComboboxItem key={supplier.value} value={supplier}>
                        {supplier.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {suppliersError && (
                <div role="alert" className="text-sm text-red-600">
                  Không thể tải danh sách nhà cung cấp.
                  <Button
                    type="button"
                    variant="link"
                    disabled={isSubmitting}
                    onClick={() => void reloadSuppliers()}
                  >
                    Tải lại
                  </Button>
                </div>
              )}
              {!data?.supplier_code && data?.supplier_name && (
                <p className="text-sm text-muted-foreground">
                  Nhà cung cấp đã nhập trước đây: {data.supplier_name}
                </p>
              )}
            </div>
          ) : key === "manufacturer_code" ? (
            <div key={key} className="space-y-2">
              <Label htmlFor="receipt-manufacturer-code">Nhà sản xuất</Label>
              <Combobox
                autoHighlight
                items={manufacturerOptions}
                limit={50}
                onInputValueChange={(query) =>
                  setManufacturerSearchQuery(normalizeSearchText(query).trim())
                }
                value={
                  manufacturerOptions.find(
                    (manufacturer) => manufacturer.value === manufacturerCode,
                  ) ?? null
                }
                onValueChange={(manufacturer) => {
                  setManufacturerCode(manufacturer?.value ?? "");
                  setError("");
                }}
                itemToStringLabel={(manufacturer) => manufacturer.label}
                itemToStringValue={(manufacturer) => manufacturer.value}
                isItemEqualToValue={(manufacturer, value) =>
                  manufacturer.value === value.value
                }
                filter={filterManufacturers}
                disabled={
                  isSubmitting || manufacturersLoading || !!manufacturersError
                }
              >
                <ComboboxInput
                  id="receipt-manufacturer-code"
                  className="w-full"
                  placeholder={
                    manufacturersLoading
                      ? "Đang tải danh sách nhà sản xuất..."
                      : "Gõ tên hoặc mã nhà sản xuất để chọn"
                  }
                  disabled={
                    isSubmitting || manufacturersLoading || !!manufacturersError
                  }
                  showClear
                />
                <ComboboxContent portalContainer={formRef}>
                  <ComboboxEmpty>
                    Không tìm thấy nhà sản xuất phù hợp.
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(manufacturer) => (
                      <ComboboxItem
                        key={manufacturer.value}
                        value={manufacturer}
                      >
                        {manufacturer.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {manufacturersError && (
                <div role="alert" className="text-sm text-red-600">
                  Không thể tải danh sách nhà sản xuất.
                  <Button
                    type="button"
                    variant="link"
                    disabled={isSubmitting}
                    onClick={() => void reloadManufacturers()}
                  >
                    Tải lại
                  </Button>
                </div>
              )}
              {!data?.manufacturer_code && data?.manufacturer_name && (
                <p className="text-sm text-muted-foreground">
                  Nhà sản xuất đã nhập trước đây: {data.manufacturer_name}
                </p>
              )}
            </div>
          ) : (
            <Fragment key={key}>
              <div className="space-y-2">
                <Label htmlFor={`receipt-${key}`}>
                  {label}
                  {required ? " *" : ""}
                </Label>
                <Input
                  id={`receipt-${key}`}
                  name={key}
                  {...(key === "manufacturer_lot_number"
                    ? {
                        value: manufacturerLotNumber,
                        onChange: (
                          event: React.ChangeEvent<HTMLInputElement>,
                        ) => setManufacturerLotNumber(event.target.value),
                      }
                    : key === "lot_number"
                      ? {
                          value: lotNumber,
                          onChange: (
                            event: React.ChangeEvent<HTMLInputElement>,
                          ) => setManualLotNumber(event.target.value),
                        }
                      : { defaultValue: data?.[key] ?? "" })}
                  maxLength={maxLength}
                  required={required}
                />
              </div>
              {key === "lot_number" && (
                <div className="space-y-2">
                  <Label htmlFor="receipt-quantity">Số lượng *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="receipt-quantity"
                      name="quantity"
                      required
                      type="number"
                      inputMode="decimal"
                      min="0.001"
                      max="999999999.999"
                      step="0.001"
                      defaultValue={data?.quantity ?? ""}
                      placeholder="Nhập số lượng"
                      className="min-w-0 flex-1"
                      aria-describedby="receipt-quantity-unit"
                    />
                    <span
                      id="receipt-quantity-unit"
                      className="max-w-32 shrink-0 truncate text-sm text-gray-400"
                      title={unit}
                      aria-label="Đơn vị tính"
                    >
                      {unit}
                    </span>
                  </div>
                </div>
              )}
            </Fragment>
          ),
        )}
        <div className="space-y-2">
          <Label htmlFor="receipt-expiry">Hạn dùng</Label>
          <Input
            id="receipt-expiry"
            name="expiry_date"
            type="date"
            min="1000-01-01"
            max="9999-12-31"
            defaultValue={data?.expiry_date?.slice(0, 10) ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receipt-note">Ghi chú</Label>
          <Textarea
            id="receipt-note"
            name="note"
            rows={4}
            defaultValue={data?.note ?? ""}
          />
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </form>
  );
}
