"use client";

import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";

export default function FormProductionOrderSolutionBaggingSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletingSummary
      productionOrderId={productionOrderId}
      stage="Đóng gói dịch"
      title="Tổng kết đóng gói dịch"
      inputQuantityLabel="Lượng dịch trước đóng"
      inputQuantityUnit="Lít"
      packedQuantityLabel="Số lượng gói đóng được theo máy đóng"
      packedQuantityUnit="Gói"
      leftoverQuantityLabel="Thể tích dịch dư"
      leftoverQuantityUnit="Lít"
      wasteQuantityLabel="Thể tích dịch hỏng"
      wasteQuantityUnit="Lít"
      loadQuantityLabel="Số sọt đóng được"
      loadQuantityUnit="sọt"
      onClose={onClose}
    />
  );
}
