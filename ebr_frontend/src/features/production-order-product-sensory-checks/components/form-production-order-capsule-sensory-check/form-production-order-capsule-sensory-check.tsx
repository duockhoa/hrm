"use client";

import {
  CAPSULE_SENSORY_REQUIREMENT,
  FormProductionOrderFixedRequirementSensoryCheck,
  type ProductionOrderFixedRequirementSensoryCheckFormProps,
} from "../form-production-order-granule-package-sensory-check/form-production-order-granule-package-sensory-check";

export default function FormProductionOrderCapsuleSensoryCheck(
  props: ProductionOrderFixedRequirementSensoryCheckFormProps,
) {
  return (
    <FormProductionOrderFixedRequirementSensoryCheck
      {...props}
      title="Kiểm tra cảm quan viên nang"
      requirementText={CAPSULE_SENSORY_REQUIREMENT}
      unitLabel="Viên nang"
      dosageFormStage="Viên nang"
      consoleErrorContext="capsule sensory check"
    />
  );
}
