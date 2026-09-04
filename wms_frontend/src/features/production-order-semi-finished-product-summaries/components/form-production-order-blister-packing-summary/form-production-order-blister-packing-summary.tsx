"use client";

import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";

export default function FormProductionOrderBlisterPackingSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletingSummary
      productionOrderId={productionOrderId}
      stage="Ép vỉ"
      title="Tổng kết ép vỉ"
      inputQuantityLabel="Số lượng viên ban đầu"
      inputQuantityUnit="Kg"
      packedQuantityLabel="Số vỉ ép được theo máy ép"
      packedQuantityUnit="Vỉ"
      leftoverQuantityLabel="Số lượng viên dư"
      leftoverQuantityUnit="Kg"
      wasteQuantityLabel="Số lượng viên hỏng"
      wasteQuantityUnit="Kg"
      onClose={onClose}
    />
  );
}
