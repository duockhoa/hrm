"use client";

import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";

export default function FormProductionOrderVialFillingSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletingSummary
      productionOrderId={productionOrderId}
      stage="Đóng lọ"
      title="Tổng kết đóng lọ"
      inputQuantityLabel="Lượng dịch ban đầu"
      inputQuantityUnit="Lít"
      packedQuantityLabel="Số lọ đóng được theo máy đóng"
      packedQuantityUnit="Lọ"
      leftoverQuantityLabel="Lượng dịch dư"
      leftoverQuantityUnit="Lít"
      wasteQuantityLabel="Lượng dịch hỏng"
      wasteQuantityUnit="Lít"
      onClose={onClose}
    />
  );
}
