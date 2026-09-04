"use client";

import * as React from "react";
import { toast } from "sonner";
import { mutate } from "swr";
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
import productionOrdersService from "@/services/product-orders.service";
import type {
  DisintegrationCheckPayload,
  ProductionOrderDisintegrationCheck,
} from "../../types";
import { DOSAGE_FORM_STAGE_OPTIONS, UNIT_KEYS } from "../../utils";
import PassFailToggle, {
  type PassFailValue,
} from "../pass-fail-toggle/pass-fail-toggle";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const toPassFailValue = (value: boolean | null | undefined): PassFailValue => {
  if (value === true) {
    return "pass";
  }

  if (value === false) {
    return "fail";
  }

  return "";
};

const toFormValues = (data: ProductionOrderDisintegrationCheck) =>
  UNIT_KEYS.reduce(
    (values, unitKey) => ({
      ...values,
      [unitKey]: toPassFailValue(data[unitKey]),
    }),
    {} as Record<(typeof UNIT_KEYS)[number], PassFailValue>,
  );

export default function EditDisintegrationCheckForm({
  data,
  onCancel,
  onSaved,
}: {
  data: ProductionOrderDisintegrationCheck;
  onCancel: () => void;
  onSaved?: (data: ProductionOrderDisintegrationCheck) => void;
}) {
  const [dosageFormStage, setDosageFormStage] = React.useState(
    data.dosage_form_stage ?? "",
  );
  const [unitResults, setUnitResults] = React.useState(() =>
    toFormValues(data),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

    if (data.id === null || data.id === undefined) {
      toast.error("Không tìm thấy bản ghi kiểm tra độ rã.");
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
        dosage_form_stage: dosageFormStage,
      } as DisintegrationCheckPayload,
    );

    try {
      setIsSubmitting(true);
      const savedData = await productionOrdersService.updateDisintegrationCheck(
        data.id,
        payload,
      );

      toast.success("Đã cập nhật kiểm tra độ rã.");
      await mutate(API_ROUTES.productionOrders.disintegrationCheckDetail(data.id));
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.disintegrationChecks(
            data.production_order_id,
          ),
        );
      }
      onSaved?.(savedData);
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật kiểm tra độ rã."),
      );
      console.error("Error updating disintegration check:", error);
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
            Cập nhật kiểm tra độ rã
          </p>

          <div className="space-y-2">
            <Label>Yêu cầu</Label>
            <Textarea
              readOnly
              aria-readonly="true"
              value={data.requirement ?? ""}
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
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
          </Button>
        </div>
      </form>
    </div>
  );
}
