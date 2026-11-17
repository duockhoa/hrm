"use client";

import ReceiptSamplingDraftForm from "@/features/warehouse-receipt-items/receipt-sampling-draft-form";

export default function FormCreateSamplingRequest({
  productionOrderId,
  onClose,
  onCreated,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
  onCreated?: () => Promise<void> | void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Soạn phiếu yêu cầu lấy mẫu thành phẩm
      </h2>
      <ReceiptSamplingDraftForm
        receipt={{ id: Number(productionOrderId) }}
        requestType="TP"
        onSubmittingChange={() => {}}
        onCancel={() => onClose?.()}
        onSaved={() => {
          onClose?.();
          void Promise.resolve(onCreated?.()).catch(() => {});
        }}
      />
    </div>
  );
}
