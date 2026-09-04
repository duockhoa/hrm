"use client";

import * as React from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import { PACKAGE_TYPE_OPTIONS } from "../../utils";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderDateCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  const [packageType, setPackageType] = React.useState("goi");
  const [requestFile, setRequestFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const dateChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.dateChecks(productionOrderId)
    : null;

  const resetForm = () => {
    setPackageType("goi");
    setRequestFile(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (!packageType) {
      toast.error("Vui lòng chọn loại bao bì.");
      return;
    }

    const formData = new FormData();
    formData.append("package_type", packageType);

    if (requestFile) {
      formData.append("request_file", requestFile);
    }

    try {
      setIsSubmitting(true);
      await productionOrdersService.createDateCheck(
        productionOrderId,
        formData,
      );
      toast.success("Đã tạo phiếu kiểm tra date.");
      resetForm();
      await mutate(dateChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể tạo phiếu kiểm tra date."),
      );
      console.error("Error creating date check:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[300px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={onSubmit}
        className="flex min-h-[268px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Tải nội dung date yêu cầu
          </p>

          <div className="space-y-2">
            <Label>Loại bao bì</Label>
            <Select
              value={packageType}
              disabled={isSubmitting}
              onValueChange={setPackageType}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn loại bao bì" />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-check-request-file">
              File yêu cầu in date
            </Label>
            <Input
              id="date-check-request-file"
              type="file"
              disabled={isSubmitting}
              onChange={(event) =>
                setRequestFile(event.target.files?.[0] ?? null)
              }
            />
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}
