"use client";

import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";

export default function FormProductionOrderTabletVialFillingSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletingSummary
      productionOrderId={productionOrderId}
      stage="Đóng lọ viên"
      title="Tổng kết đóng lọ viên"
      inputQuantityLabel="Khối lượng viên ban đầu"
      inputQuantityUnit="kg"
      packedQuantityLabel="Số lọ đóng được"
      packedQuantityUnit="lọ"
      leftoverQuantityLabel="Khối lượng viên dư"
      leftoverQuantityUnit="kg"
      wasteQuantityLabel="Khối lượng viên hỏng"
      wasteQuantityUnit="kg"
      loadQuantityLabel="Tổng số sọt lọ"
      loadQuantityUnit="sọt"
      onClose={onClose}
    />
  );
}
