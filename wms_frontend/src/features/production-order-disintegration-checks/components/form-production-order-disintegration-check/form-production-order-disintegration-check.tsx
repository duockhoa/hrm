"use client";

import * as React from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import itemsService from "@/services/items.service";
import productionOrdersService from "@/services/product-orders.service";
import type { DisintegrationCheckPayload } from "../../types";
import {
  DOSAGE_FORM_STAGE_OPTIONS,
  UNIT_KEYS,
  buildDisintegrationRequirement,
} from "../../utils";
import PassFailToggle, {
  type PassFailValue,
} from "../pass-fail-toggle/pass-fail-toggle";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const createDefaultResults = () =>
  UNIT_KEYS.reduce(
    (values, unitKey) => ({
      ...values,
      [unitKey]: "",
    }),
    {} as Record<(typeof UNIT_KEYS)[number], PassFailValue>,
  );

export default function FormProductionOrderDisintegrationCheck({
  productionOrderId,
  itemCode,
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  onClose?: () => void;
}) {
  const itemCodeValue = itemCode ? String(itemCode) : "";
  const { data: item, isLoading: isLoadingItem } = useSWR(
    itemCodeValue
      ? `${API_ROUTES.items.base}/${encodeURIComponent(itemCodeValue)}`
      : null,
    () => itemsService.fetchItemById(itemCodeValue),
  );
  const [dosageFormStage, setDosageFormStage] = React.useState("");
  const [unitResults, setUnitResults] = React.useState(createDefaultResults);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const disintegrationChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.disintegrationChecks(productionOrderId)
    : null;
  const requirement = buildDisintegrationRequirement(
    item?.productionSpecification ?? item,
  );

  const resetForm = () => {
    setDosageFormStage("");
    setUnitResults(createDefaultResults());
  };

  const handleUnitChange = (
    unitKey: (typeof UNIT_KEYS)[number],
    value: "pass" | "fail",
  ) => {
    setUnitResults((currentValues) => ({
      ...currentValues,
      [unitKey]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (isLoadingItem) {
      toast.error("Đang tải specification của Item.");
      return;
    }

    if (!dosageFormStage) {
      toast.error("Vui lòng chọn dạng/công đoạn kiểm tra.");
      return;
    }

    if (!unitResults.unit_1_passed) {
      toast.error("Vui lòng chọn kết quả viên 1.");
      return;
    }

    const payload = UNIT_KEYS.reduce(
      (values, unitKey) => ({
        ...values,
        [unitKey]:
          unitResults[unitKey] === "" ? null : unitResults[unitKey] === "pass",
      }),
      {
        requirement: requirement || null,
        dosage_form_stage: dosageFormStage,
      } as DisintegrationCheckPayload,
    );

    try {
      setIsSubmitting(true);
      await productionOrdersService.createDisintegrationCheck(
        productionOrderId,
        payload,
      );
      toast.success("Đã lưu kiểm tra độ rã.");
      resetForm();
      await mutate(disintegrationChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể lưu kiểm tra độ rã."));
      console.error("Error creating disintegration check:", error);
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
            Kiểm tra độ rã
          </p>

          <div className="space-y-2">
            <Label>Yêu cầu</Label>
            <Textarea
              readOnly
              aria-readonly="true"
              value={requirement}
              className="bg-gray-100 text-gray-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Dạng/công đoạn kiểm tra</Label>
            <Select
              value={dosageFormStage}
              disabled={isSubmitting}
              onValueChange={setDosageFormStage}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn dạng/công đoạn" />
              </SelectTrigger>
              <SelectContent>
                {DOSAGE_FORM_STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            {UNIT_KEYS.map((unitKey, index) => (
              <div key={unitKey} className="space-y-2">
                <Label>Viên {index + 1}{index === 0 ? " *" : ""}</Label>
                <PassFailToggle
                  value={unitResults[unitKey]}
                  disabled={isSubmitting}
                  onChange={(value) => handleUnitChange(unitKey, value)}
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
            onClick={resetForm}
          >
            Đặt lại
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoadingItem}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}
