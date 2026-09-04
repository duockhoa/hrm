"use client";

import {
  QrInputButton,
  QrScanDialog,
} from "@/components/qr-scan-dialog/qr-scan-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { productionWorkshopsService } from "@/services/index.service";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  CreateProductionWorkshopPressureDifferentialPayload,
  PressureDifferentialConclusion,
  ProductionWorkshopPressureDifferential,
  UpdateProductionWorkshopPressureDifferentialPayload,
} from "../../types";

type FormState = {
  gauge_name: string;
  differential_pressure: string;
};

type PressureSpec = {
  target: number;
  tolerance: number;
  min: number;
  max: number;
  unit: string;
};

type FormProductionWorkshopPressureDifferentialProps = {
  workshopId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pressureDifferential?: ProductionWorkshopPressureDifferential | null;
  onSaved: () => void | Promise<void>;
};

const emptyForm: FormState = {
  gauge_name: "",
  differential_pressure: "",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const labelQrKeys = [
  "label",
  "label_qr_code",
  "qr_code",
  "gauge_name",
  "ma",
  "code",
];

const getValueByKeys = (source: Record<string, unknown>, keys: string[]) => {
  const sourceEntries = Object.entries(source);

  for (const key of keys) {
    const match = sourceEntries.find(
      ([sourceKey]) => sourceKey.toLowerCase() === key.toLowerCase(),
    );

    if (match?.[1] !== undefined && match[1] !== null) {
      return String(match[1]);
    }
  }

  return null;
};

const parseQrLabel = (decodedText: string) => {
  const text = decodedText.trim();

  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const value = getValueByKeys(json as Record<string, unknown>, labelQrKeys);
      if (value) {
        return value.trim();
      }
    }
  } catch {
    // QR may be plain text, a URL, or query params.
  }

  try {
    const url = new URL(text);
    const value = getValueByKeys(
      Object.fromEntries(url.searchParams.entries()),
      labelQrKeys,
    );
    if (value) {
      return value.trim();
    }
  } catch {
    const params = new URLSearchParams(text);
    const value = getValueByKeys(
      Object.fromEntries(params.entries()),
      labelQrKeys,
    );
    if (value) {
      return value.trim();
    }
  }

  return text;
};

const parseNumber = (value: string) => Number(value.replace(",", "."));

const parsePressureSpec = (qrCode: string): PressureSpec | null => {
  const specText = qrCode.includes("$")
    ? qrCode.slice(qrCode.lastIndexOf("$") + 1)
    : qrCode;
  const match = specText.match(
    /(-?\d+(?:[.,]\d+)?)\s*±\s*(\d+(?:[.,]\d+)?)\s*(?:-\s*([^\s]+))?/i,
  );

  if (!match) {
    return null;
  }

  const target = parseNumber(match[1]);
  const tolerance = parseNumber(match[2]);

  if (Number.isNaN(target) || Number.isNaN(tolerance)) {
    return null;
  }

  return {
    target,
    tolerance,
    min: target - tolerance,
    max: target + tolerance,
    unit: match[3] || "Pa",
  };
};

const getConclusion = (
  qrCode: string,
  pressureValue: number,
): PressureDifferentialConclusion | null => {
  const spec = parsePressureSpec(qrCode);

  if (!spec) {
    return null;
  }

  return pressureValue >= spec.min && pressureValue <= spec.max
    ? "dat"
    : "khong_dat";
};

const getInitialForm = (
  pressureDifferential?: ProductionWorkshopPressureDifferential | null,
): FormState => {
  if (!pressureDifferential) {
    return emptyForm;
  }

  return {
    gauge_name: pressureDifferential.gauge_name ?? "",
    differential_pressure: String(
      pressureDifferential.differential_pressure ?? "",
    ),
  };
};

export default function FormProductionWorkshopPressureDifferential({
  workshopId,
  open,
  onOpenChange,
  pressureDifferential,
  onSaved,
}: FormProductionWorkshopPressureDifferentialProps) {
  const [form, setForm] = useState<FormState>(() =>
    getInitialForm(pressureDifferential),
  );
  const [isLabelQrScannerOpen, setIsLabelQrScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(pressureDifferential);
  const pressureValue = Number.parseInt(form.differential_pressure, 10);
  const pressureSpec = useMemo(
    () => parsePressureSpec(form.gauge_name),
    [form.gauge_name],
  );
  const previewConclusion =
    !Number.isNaN(pressureValue) && pressureSpec
      ? getConclusion(form.gauge_name, pressureValue)
      : null;

  const handleQrScan = useCallback((decodedText: string) => {
    const scannedValue = parseQrLabel(decodedText);

    if (!scannedValue) {
      toast.error("Không đọc được QR code.");
      return;
    }

    setForm((current) => ({
      ...current,
      gauge_name: scannedValue,
    }));
    toast.success("Đã quét QR và điền QR code.");
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const gaugeName = form.gauge_name.trim();
    const submittedPressureValue = Number.parseInt(
      form.differential_pressure,
      10,
    );

    if (!gaugeName) {
      toast.error("Vui lòng nhập QR code.");
      return;
    }

    if (Number.isNaN(submittedPressureValue)) {
      toast.error("Vui lòng nhập chênh áp là số nguyên.");
      return;
    }

    const conclusion = getConclusion(gaugeName, submittedPressureValue);

    if (!conclusion) {
      toast.error("QR code không có ngưỡng chênh áp hợp lệ, ví dụ: 5±2-Pa.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProductionWorkshopPressureDifferentialPayload = {
        gauge_name: gaugeName,
        differential_pressure: submittedPressureValue,
        conclusion,
      };

      if (pressureDifferential) {
        await productionWorkshopsService.updatePressureDifferential(
          pressureDifferential.id,
          payload as UpdateProductionWorkshopPressureDifferentialPayload,
        );
        toast.success("Đã cập nhật chênh áp.");
      } else {
        await productionWorkshopsService.createPressureDifferential(
          workshopId,
          payload,
        );
        toast.success("Đã thêm chênh áp.");
      }

      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu chênh áp."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="text-center">
          <DialogTitle className="text-center text-xl">
            {isEditing ? "Cập nhật chênh áp" : "Thêm chênh áp"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="gauge-name">
              QR code
            </label>
            <div className="relative w-full">
              <Input
                id="gauge-name"
                className="pr-11"
                value={form.gauge_name}
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    gauge_name: event.target.value,
                  }))
                }
              />
              <QrInputButton
                disabled={isSubmitting}
                onClick={() => setIsLabelQrScannerOpen(true)}
              />
            </div>
            {pressureSpec ? (
              <p className="text-xs text-gray-500">
                Ngưỡng đạt: {pressureSpec.min} - {pressureSpec.max}{" "}
                {pressureSpec.unit}
              </p>
            ) : form.gauge_name.trim() ? (
              <p className="text-xs text-amber-600">
                QR code cần có ngưỡng dạng 5±2-Pa.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="pressure-value">
              Chênh áp
            </label>
            <Input
              id="pressure-value"
              type="number"
              step={1}
              value={form.differential_pressure}
              disabled={isSubmitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  differential_pressure: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Kết luận</div>
            {previewConclusion && (
              <Badge
                variant={
                  previewConclusion === "dat" ? "secondary" : "destructive"
                }
              >
                {previewConclusion === "dat" ? "Đạt" : "Không đạt"}
              </Badge>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <QrScanDialog
        open={isLabelQrScannerOpen}
        title="Quét QR code"
        description="Đưa mã QR vào khung camera để tự động điền QR code."
        onOpenChange={setIsLabelQrScannerOpen}
        onScan={handleQrScan}
      />
    </Dialog>
  );
}
