"use client";

import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";

export default function FormProductionOrderCapsuleFillingSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletingSummary
      productionOrderId={productionOrderId}
      stage="Đóng nang"
      title="Tổng kết đóng nang"
      inputQuantityLabel="Khối lượng cốm ban đầu"
      inputQuantityUnit="kg"
      packedQuantityLabel="Khối lượng viên nang đóng được"
      packedQuantityUnit="kg"
      leftoverQuantityLabel="Khối lượng cốm dư"
      leftoverQuantityUnit="kg"
      wasteQuantityLabel="Khối lượng cốm hỏng"
      wasteQuantityUnit="kg"
      onClose={onClose}
    />
  );
}
