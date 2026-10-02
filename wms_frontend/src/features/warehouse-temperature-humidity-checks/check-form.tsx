"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import warehouseTemperatureHumidityChecksService, {
  type WarehouseTemperatureHumidityCheck,
  type WarehouseTemperatureHumidityCheckPayload,
} from "@/services/warehouse-temperature-humidity-checks.service";

export function checkError(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    if (error.response?.status === 403)
      return "Bạn không có quyền thực hiện thao tác này.";
    if (error.response?.status === 404)
      return "Không tìm thấy bản ghi kiểm tra nhiệt độ, độ ẩm kho.";
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join("; ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function CheckForm({
  data,
  onCancel,
  onSaved,
}: {
  data?: WarehouseTemperatureHumidityCheck;
  onCancel: () => void;
  onSaved: (check: WarehouseTemperatureHumidityCheck) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(
    data?.is_passed === true
      ? "true"
      : data?.is_passed === false
        ? "false"
        : "",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    const requirement = text("requirement");
    if (!text("location") || !requirement) {
      setError("Vui lòng nhập vị trí và yêu cầu kiểm tra.");
      return;
    }
    if (new TextEncoder().encode(requirement).length > 65535) {
      setError("Yêu cầu vượt quá giới hạn 65535 byte UTF-8.");
      return;
    }
    if (result !== "true" && result !== "false") {
      setError("Vui lòng chọn kết quả Đạt hoặc Không đạt.");
      return;
    }
    for (const field of ["temperature", "humidity"]) {
      const value = text(field);
      const number = Number(value);
      const min = field === "humidity" ? 0 : -999.99;
      const max = field === "humidity" ? 100 : 999.99;
      if (
        !/^-?\d+(?:\.\d{1,2})?$/.test(value) ||
        !Number.isFinite(number) ||
        number < min ||
        number > max
      ) {
        setError(
          `${field === "humidity" ? "Độ ẩm" : "Nhiệt độ"} phải từ ${min} đến ${max}, tối đa 2 chữ số thập phân.`,
        );
        return;
      }
    }
    const payload: WarehouseTemperatureHumidityCheckPayload = {
      location: text("location"),
      requirement,
      temperature: Number(text("temperature")),
      humidity: Number(text("humidity")),
      is_passed: result === "true",
    };
    try {
      setIsSubmitting(true);
      setError("");
      const changes = data
        ? Object.fromEntries(
            Object.entries(payload).filter(
              ([key, value]) =>
                value !==
                (key === "temperature" || key === "humidity"
                  ? Number(data[key])
                  : data[key as keyof WarehouseTemperatureHumidityCheck]),
            ),
          )
        : payload;
      if (data && Object.keys(changes).length === 0) {
        onCancel();
        return;
      }
      const saved = data
        ? await warehouseTemperatureHumidityChecksService.update(
            data.id,
            changes,
          )
        : await warehouseTemperatureHumidityChecksService.create(payload);
      toast.success(
        data
          ? "Đã cập nhật kiểm tra nhiệt độ, độ ẩm kho."
          : "Đã thêm kiểm tra nhiệt độ, độ ẩm kho.",
      );
      onSaved(saved);
    } catch (error) {
      setError(
        checkError(error, "Không thể lưu kiểm tra nhiệt độ, độ ẩm kho."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="check-location">Vị trí *</Label>
          <Input
            id="check-location"
            name="location"
            defaultValue={data?.location ?? ""}
            maxLength={255}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="check-requirement">Yêu cầu *</Label>
          <Textarea
            id="check-requirement"
            name="requirement"
            rows={4}
            defaultValue={data?.requirement ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="check-temperature">Nhiệt độ (°C) *</Label>
          <Input
            id="check-temperature"
            name="temperature"
            type="number"
            step="0.01"
            min={-999.99}
            max={999.99}
            defaultValue={data?.temperature ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="check-humidity">Độ ẩm (%RH) *</Label>
          <Input
            id="check-humidity"
            name="humidity"
            type="number"
            step="0.01"
            min={0}
            max={100}
            defaultValue={data?.humidity ?? ""}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="check-result">Kết quả *</Label>
          <Select
            value={result}
            onValueChange={setResult}
            disabled={isSubmitting}
          >
            <SelectTrigger
              id="check-result"
              className="w-full"
              aria-required="true"
            >
              <SelectValue placeholder="Chọn kết quả kiểm tra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Đạt</SelectItem>
              <SelectItem value="false">Không đạt</SelectItem>
            </SelectContent>
          </Select>
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
