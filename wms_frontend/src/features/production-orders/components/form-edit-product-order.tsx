"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";

const getProductionOrderId = (productionOrder: any) =>
  productionOrder?.id ??
  productionOrder?.production_order_id ??
  productionOrder?.DocumentAbsoluteEntry;

export default function EditProductOrderForm({
  productionOrder,
  onClose,
}: {
  productionOrder: any;
  onClose?: () => void;
}) {
  const productionOrderId = getProductionOrderId(productionOrder);
  const [remarks, setRemarks] = useState(
    productionOrder?.remarks ?? productionOrder?.Remarks ?? "",
  );
  const [changeContent, setChangeContent] = useState(
    productionOrder?.change_content ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (productionOrderId === null || productionOrderId === undefined) {
      toast.error("Không tìm thấy mã lệnh sản xuất.");
      return;
    }

    setIsSaving(true);

    try {
      const initialRemarks =
        productionOrder?.remarks ?? productionOrder?.Remarks ?? "";
      const initialChangeContent = productionOrder?.change_content ?? "";
      const nextChangeContent = changeContent.trim();
      const updateRequests: Promise<unknown>[] = [];

      if (remarks !== initialRemarks) {
        updateRequests.push(
          productionOrdersService.updateSapProductionOrder(productionOrderId, {
            Remarks: remarks,
          }),
        );
      }

      if (nextChangeContent !== initialChangeContent) {
        updateRequests.push(
          productionOrdersService.updateProductionOrderChangeContent(
            productionOrderId,
            { change_content: nextChangeContent || null },
          ),
        );
      }

      if (updateRequests.length === 0) {
        toast.info("Không có thay đổi để cập nhật.");
        return;
      }

      await Promise.all(updateRequests);
      await Promise.all([
        mutate(`${API_ROUTES.productionOrders.base}/${productionOrderId}`),
        mutate(API_ROUTES.productionOrders.base),
      ]);
      toast.success("Đã cập nhật lệnh sản xuất.");
      onClose?.();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ?? "Không thể cập nhật lệnh sản xuất.",
      );
      console.error("Error updating production order:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900" htmlFor="remarks">
          Ghi chú
        </label>
        <Textarea
          id="remarks"
          className="min-h-28 resize-y"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="Nhập ghi chú"
          disabled={isSaving}
        />
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-gray-900"
          htmlFor="change-content"
        >
          Nội dung thay đổi
        </label>
        <Textarea
          id="change-content"
          className="min-h-28 resize-y"
          value={changeContent}
          onChange={(event) => setChangeContent(event.target.value)}
          placeholder="Nhập nội dung thay đổi"
          disabled={isSaving}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
          Hủy
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : null}
          Lưu
        </Button>
      </div>
    </form>
  );
}
