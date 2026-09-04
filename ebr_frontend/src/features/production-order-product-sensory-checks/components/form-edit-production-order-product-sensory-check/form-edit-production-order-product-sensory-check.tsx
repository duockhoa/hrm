"use client";

import {
  FormProductionOrderFixedRequirementSensoryCheck,
  type ProductionOrderFixedRequirementSensoryCheckFormProps,
} from "../form-production-order-granule-package-sensory-check/form-production-order-granule-package-sensory-check";

export default function FormEditProductionOrderProductSensoryCheck({
  data,
  ...props
}: ProductionOrderFixedRequirementSensoryCheckFormProps) {
  return (
    <FormProductionOrderFixedRequirementSensoryCheck
      {...props}
      data={data}
      title="Cập nhật kiểm tra cảm quan sản phẩm"
      requirementText={data?.requirement ?? ""}
      unitLabel="Đơn vị"
      consoleErrorContext="product sensory check edit"
      allowRequirementUpdate={false}
    />
  );
}
