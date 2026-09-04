"use client";

import {
  buildFilmCoatedTabletWeightRequirement,
  hasFilmCoatedTabletWeightSpecificationLimits,
  type ProductionSpecificationLimits,
} from "../../utils";
import FormProductionOrderTabletWeightCheck from "../form-production-order-tablet-weight-check/form-production-order-tablet-weight-check";

export default function FormProductionOrderFilmCoatedTabletWeightCheck({
  productionOrderId,
  itemCode,
  productionSpecification,
  onClose,
}: {
  productionOrderId: string | number;
  itemCode?: string | number | null;
  productionSpecification?: ProductionSpecificationLimits;
  onClose?: () => void;
}) {
  return (
    <FormProductionOrderTabletWeightCheck
      productionOrderId={productionOrderId}
      itemCode={itemCode}
      productionSpecification={productionSpecification}
      title="Kiểm tra khối lượng viên nén bao phim"
      unit="mg"
      unitLabel="mg"
      dosageFormStage="Viên nén bao phim"
      hasSpecificationLimits={hasFilmCoatedTabletWeightSpecificationLimits}
      buildRequirement={buildFilmCoatedTabletWeightRequirement}
      onClose={onClose}
    />
  );
}
