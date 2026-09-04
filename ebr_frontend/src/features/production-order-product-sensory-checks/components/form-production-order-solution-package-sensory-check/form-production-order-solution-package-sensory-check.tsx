"use client";

import {
  FormProductionOrderFixedRequirementSensoryCheck,
  SOLUTION_PACKAGE_SENSORY_REQUIREMENT,
  type ProductionOrderFixedRequirementSensoryCheckFormProps,
} from "../form-production-order-granule-package-sensory-check/form-production-order-granule-package-sensory-check";

export default function FormProductionOrderSolutionPackageSensoryCheck(
  props: ProductionOrderFixedRequirementSensoryCheckFormProps,
) {
  return (
    <FormProductionOrderFixedRequirementSensoryCheck
      {...props}
      title="Kiểm tra cảm quan gói dịch"
      requirementText={SOLUTION_PACKAGE_SENSORY_REQUIREMENT}
      unitLabel="Gói dịch"
      dosageFormStage="Gói dịch"
      consoleErrorContext="solution package sensory check"
    />
  );
}
