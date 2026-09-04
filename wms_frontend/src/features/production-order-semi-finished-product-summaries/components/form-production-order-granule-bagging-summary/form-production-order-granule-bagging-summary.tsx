"use client";

import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";

export default function FormProductionOrderGranuleBaggingSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletingSummary
      productionOrderId={productionOrderId}
      stage="Đóng túi cốm"
      title="Tổng kết đóng túi cốm"
      packedQuantityLabel="Số lượng gói đóng được theo máy đóng"
      packedQuantityUnit="Túi"
      onClose={onClose}
    />
  );
}
