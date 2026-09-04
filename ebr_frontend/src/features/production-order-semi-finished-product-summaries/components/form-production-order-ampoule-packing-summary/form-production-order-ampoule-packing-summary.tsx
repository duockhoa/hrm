"use client";

import FormProductionOrderTabletingSummary from "../form-production-order-tableting-summary/form-production-order-tableting-summary";

export default function FormProductionOrderAmpoulePackingSummary({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletingSummary
      productionOrderId={productionOrderId}
      stage="Đóng ống bẻ"
      title="Tổng kết đóng ống bẻ"
      inputQuantityLabel="Thể tích dịch ban đầu"
      inputQuantityUnit="Lít"
      packedQuantityLabel="Số vỉ đóng được theo máy đóng"
      packedQuantityUnit="Vỉ"
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
