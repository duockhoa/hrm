"use client";

import {
  BLISTER_SENSORY_REQUIREMENT,
  FormProductionOrderFixedRequirementSensoryCheck,
  type ProductionOrderFixedRequirementSensoryCheckFormProps,
} from "../form-production-order-granule-package-sensory-check/form-production-order-granule-package-sensory-check";

export default function FormProductionOrderBlisterSensoryCheck(
  props: ProductionOrderFixedRequirementSensoryCheckFormProps,
) {
  return (
    <FormProductionOrderFixedRequirementSensoryCheck
      {...props}
      title="Kiểm tra cảm quan vỉ"
      requirementText={BLISTER_SENSORY_REQUIREMENT}
      unitLabel="Vỉ"
      dosageFormStage="Vỉ"
      consoleErrorContext="blister sensory check"
    />
  );
}
