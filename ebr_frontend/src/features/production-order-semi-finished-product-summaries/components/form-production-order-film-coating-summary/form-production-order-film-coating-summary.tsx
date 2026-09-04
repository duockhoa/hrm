"use client";

import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";

export default function FormProductionOrderFilmCoatingSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletingSummary
      productionOrderId={productionOrderId}
      stage="Bao phim"
      title="Tổng kết bao phim"
      inputQuantityLabel="Khối lượng viên ban đầu"
      inputQuantityUnit="Kg"
      packedQuantityLabel="Khối lượng viên bao được"
      packedQuantityUnit="Kg"
      leftoverQuantityLabel="Khối lượng viên dư"
      leftoverQuantityUnit="Kg"
      wasteQuantityLabel="Khối lượng viên hỏng"
      wasteQuantityUnit="Kg"
      onClose={onClose}
    />
  );
}
