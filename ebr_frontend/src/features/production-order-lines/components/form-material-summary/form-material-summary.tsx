"use client";

import * as React from "react";
import { toast } from "sonner";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import productionOrdersService from "@/services/product-orders.service";
import {
  formatNumber,
  formatText,
  getProductionOrderLineLotNo,
  getProductionOrderLineMaterialCode,
  getProductionOrderLineUnit,
  type ProductionOrderLine,
  type ProductionOrderMaterialSummary,
  type ProductionOrderMaterialSummaryPayload,
} from "../../utils";

const QUANTITY_FIELDS = [
  { key: "received_quantity", label: "Số lượng nhận" },
  { key: "used_quantity", label: "Số lượng sử dụng" },
  { key: "supplier_waste_quantity", label: "Hao hụt NCC" },
  { key: "production_waste_quantity", label: "Hao hụt sản xuất" },
  { key: "remaining_quantity", label: "Số lượng còn lại" },
  { key: "sample_quantity", label: "Số lượng mẫu" },
] as const;

type QuantityFieldKey = (typeof QUANTITY_FIELDS)[number]["key"];

type QuantityValues = Record<QuantityFieldKey, string>;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const toInputValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const toPayloadValue = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
};

const getInitialValues = (
  summary: ProductionOrderMaterialSummary | null | undefined,
): QuantityValues => ({
  received_quantity: toInputValue(summary?.received_quantity),
  used_quantity: toInputValue(summary?.used_quantity),
  supplier_waste_quantity: toInputValue(summary?.supplier_waste_quantity),
  production_waste_quantity: toInputValue(summary?.production_waste_quantity),
  remaining_quantity: toInputValue(summary?.remaining_quantity),
  sample_quantity: toInputValue(summary?.sample_quantity),
});

export default function FormMaterialSummary({
  productionOrderId,
  line,
  summary,
  onCancel,
  onSaved,
}: {
  productionOrderId: string | number;
  line: ProductionOrderLine;
  summary?: ProductionOrderMaterialSummary | null;
  onCancel?: () => void;
  onSaved?: () => Promise<void> | void;
}) {
  const [values, setValues] = React.useState<QuantityValues>(() =>
    getInitialValues(summary),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const materialCode = getProductionOrderLineMaterialCode(line);
  const lotNo = getProductionOrderLineLotNo(line);
  const unit = summary?.unit ?? getProductionOrderLineUnit(line);
  const isEditing = summary?.id !== null && summary?.id !== undefined;

  const handleChange = (key: QuantityFieldKey, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!materialCode) {
      toast.error("Không tìm thấy mã vật liệu.");
      return;
    }

    const payload: ProductionOrderMaterialSummaryPayload = {
      material_code: materialCode,
      lot_no: lotNo || null,
      received_quantity: toPayloadValue(values.received_quantity),
      used_quantity: toPayloadValue(values.used_quantity),
      supplier_waste_quantity: toPayloadValue(
        values.supplier_waste_quantity,
      ),
      production_waste_quantity: toPayloadValue(
        values.production_waste_quantity,
      ),
      remaining_quantity: toPayloadValue(values.remaining_quantity),
      sample_quantity: toPayloadValue(values.sample_quantity),
    };

    try {
      setIsSubmitting(true);

      if (isEditing && summary?.id !== undefined && summary.id !== null) {
        await productionOrdersService.updateMaterialSummary(summary.id, payload);
        toast.success("Đã cập nhật tổng kết vật liệu.");
      } else {
        await productionOrdersService.createMaterialSummary(
          productionOrderId,
          payload,
        );
        toast.success("Đã tạo tổng kết vật liệu.");
      }

      await onSaved?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu tổng kết vật liệu."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[420px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[388px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Tổng kết vật liệu
          </p>

          <div className="rounded border bg-gray-50 p-3">
            <div className="flex flex-col gap-3">
              <FieldDisplay
                lable="Tên vật liệu"
                value={formatText(summary?.material_name ?? line.ItemName)}
              />
              <FieldDisplay lable="Số lô" value={lotNo} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 text-left">
                  <div className="text-sm font-semibold text-gray-600">
                    Đơn vị tính
                  </div>
                  <div className="mt-1 text-gray-800 wrap-anywhere">
                    {formatText(unit)}
                  </div>
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-sm font-semibold text-gray-600">
                    Số lượng yêu cầu
                  </div>
                  <div className="mt-1 text-gray-800 wrap-anywhere">
                    {formatNumber(line.PlannedQuantity)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {QUANTITY_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`material-summary-${field.key}`}>
                  {field.label}
                </Label>
                <Input
                  id={`material-summary-${field.key}`}
                  inputMode="decimal"
                  disabled={isSubmitting}
                  value={values[field.key]}
                  onChange={(event) =>
                    handleChange(field.key, event.target.value)
                  }
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

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
            {isSubmitting
              ? "Đang lưu..."
              : isEditing
                ? "Cập nhật"
                : "Tổng kết"}
          </Button>
        </div>
      </form>
    </div>
  );
}
