"use client";

import * as React from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import userService from "@/services/user.service";
import type { PrimaryPackagingConfirmationPayload } from "../types";

const confirmationFields = [
  {
    name: "volume_weight_checked",
    label: "Thể tích/khối lượng",
  },
  { name: "sensory_checked", label: "Cảm quan" },
  { name: "date_print_checked", label: "In date" },
  { name: "hygiene_checked", label: "Vệ sinh" },
  { name: "seal_integrity_checked", label: "Độ kín" },
] as const;

type ConfirmationFieldName = (typeof confirmationFields)[number]["name"];
type ConfirmationResults = Record<ConfirmationFieldName, boolean | null>;

const createEmptyResults = (): ConfirmationResults => ({
  volume_weight_checked: null,
  sensory_checked: null,
  date_print_checked: null,
  hygiene_checked: null,
  seal_integrity_checked: null,
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const getUserLabel = (
  user:
    | {
        name?: string | null;
        username?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
) => user?.name ?? user?.username ?? user?.email ?? "Đang xác định";

function PassFailToggle({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: boolean) => void;
  value: boolean | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-pressed={value === true}
        className={
          value === true
            ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
            : ""
        }
        onClick={() => onChange(true)}
      >
        Đạt
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-pressed={value === false}
        className={
          value === false
            ? "border-red-600 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
            : ""
        }
        onClick={() => onChange(false)}
      >
        Không đạt
      </Button>
    </div>
  );
}

export default function FormPrimaryPackagingConfirmation({
  onClose,
  productionOrderId,
}: {
  onClose?: () => void;
  productionOrderId: string | number;
}) {
  const [results, setResults] = React.useState<ConfirmationResults>(
    createEmptyResults,
  );
  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useSWR(
    API_ROUTES.users.me,
    userService.fetcherMe,
  );

  const confirmationsKey = productionOrderId
    ? API_ROUTES.productionOrders.primaryPackagingConfirmations(
        productionOrderId,
      )
    : null;

  const resetForm = () => {
    setResults(createEmptyResults());
    setNote("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const missingField = confirmationFields.find(
      (field) => results[field.name] === null,
    );
    if (missingField) {
      toast.error(`Vui lòng xác nhận ${missingField.label}.`);
      return;
    }

    const payload: PrimaryPackagingConfirmationPayload = {
      volume_weight_checked: Boolean(results.volume_weight_checked),
      sensory_checked: Boolean(results.sensory_checked),
      date_print_checked: Boolean(results.date_print_checked),
      hygiene_checked: Boolean(results.hygiene_checked),
      seal_integrity_checked: Boolean(results.seal_integrity_checked),
      note: note.trim() || null,
    };

    try {
      setIsSubmitting(true);
      await productionOrdersService.createPrimaryPackagingConfirmation(
        productionOrderId,
        payload,
      );
      toast.success("Đã xác nhận trước đóng gói bao bì cấp 1.");
      resetForm();
      if (confirmationsKey) {
        await mutate(confirmationsKey);
      }
      onClose?.();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể xác nhận trước đóng gói bao bì cấp 1.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-center text-xl font-semibold uppercase text-gray-900">
          Xác nhận trước đóng gói bao bì cấp 1
        </p>

        <div className="rounded border bg-gray-50 p-3 text-sm">
          <span className="font-medium text-gray-700">Người kiểm tra: </span>
          <span className="text-gray-900">
            {isLoadingCurrentUser ? "Đang tải..." : getUserLabel(currentUser)}
          </span>
          <p className="mt-1 text-xs text-gray-500">
            Được tự động lấy từ tài khoản đang đăng nhập.
          </p>
        </div>

        {confirmationFields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}</Label>
            <PassFailToggle
              value={results[field.name]}
              disabled={isSubmitting}
              onChange={(value) =>
                setResults((current) => ({
                  ...current,
                  [field.name]: value,
                }))
              }
            />
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="primary-packaging-confirmation-note">Ghi chú</Label>
          <Textarea
            id="primary-packaging-confirmation-note"
            value={note}
            disabled={isSubmitting}
            onChange={(event) => setNote(event.target.value)}
          />
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
            {isSubmitting ? "Đang lưu..." : "Xác nhận"}
          </Button>
        </div>
      </form>
    </div>
  );
}
