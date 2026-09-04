"use client";

import {
  BOTTLE_SENSORY_REQUIREMENT,
  FormProductionOrderFixedRequirementSensoryCheck,
  type ProductionOrderFixedRequirementSensoryCheckFormProps,
} from "../form-production-order-granule-package-sensory-check/form-production-order-granule-package-sensory-check";

export default function FormProductionOrderBottleSensoryCheck(
  props: ProductionOrderFixedRequirementSensoryCheckFormProps,
) {
  return (
    <FormProductionOrderFixedRequirementSensoryCheck
      {...props}
      title="Kiểm tra cảm quan lọ"
      requirementText={BOTTLE_SENSORY_REQUIREMENT}
      unitLabel="Lọ"
      dosageFormStage="Lọ"
      consoleErrorContext="bottle sensory check"
    />
  );
}
