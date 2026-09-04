"use client";

import {
  FormProductionOrderFixedRequirementSensoryCheck,
  TABLET_WEIGHT_SENSORY_REQUIREMENT,
  type ProductionOrderFixedRequirementSensoryCheckFormProps,
} from "../form-production-order-granule-package-sensory-check/form-production-order-granule-package-sensory-check";

export default function FormProductionOrderTabletWeightSensoryCheck(
  props: ProductionOrderFixedRequirementSensoryCheckFormProps,
) {
  return (
    <FormProductionOrderFixedRequirementSensoryCheck
      {...props}
      title="Kiểm tra cảm quan viên nén"
      requirementText={TABLET_WEIGHT_SENSORY_REQUIREMENT}
      unitLabel="Viên nén"
      dosageFormStage="Viên nén"
      consoleErrorContext="tablet weight sensory check"
    />
  );
}
