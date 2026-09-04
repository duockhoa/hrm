"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const SEMI_FINISHED_PRODUCT_LABEL_URL = "/label/semi-finished-product-label";

export default function SemiFinishedProductLabelForm({
  productionOrderId,
  onClose,
}: {
  productionOrderId?: string | number | null;
  onClose?: () => void;
}) {
  const [quantity, setQuantity] = React.useState(1);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productionOrderId) {
      toast.error("Không tìm thấy mã lệnh sản xuất");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error("Số lượng nhãn phải lớn hơn 0");
      return;
    }

    const url = new URL(
      SEMI_FINISHED_PRODUCT_LABEL_URL,
      window.location.origin,
    );

    url.search = new URLSearchParams({
      id: String(productionOrderId),
      quantity: String(quantity),
    }).toString();

    window.open(url.toString(), "_blank", "noopener,noreferrer");
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-center text-xl font-semibold uppercase text-gray-900">
        Tạo nhãn BTP
      </p>

      <div className="space-y-2">
        <label
          htmlFor="semi-finished-label-quantity"
          className="text-sm font-medium text-gray-700"
        >
          Số lượng nhãn BTP
        </label>
        <Input
          id="semi-finished-label-quantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(event) => {
            setQuantity(Number(event.target.value));
          }}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit">Đồng ý</Button>
      </div>
    </form>
  );
}
