"use client";

import {
  FormProductionOrderFixedRequirementSensoryCheck,
  type ProductionOrderFixedRequirementSensoryCheckFormProps,
} from "../form-production-order-granule-package-sensory-check/form-production-order-granule-package-sensory-check";

export default function FormProductionOrderAmpouleSensoryCheck(
  props: ProductionOrderFixedRequirementSensoryCheckFormProps,
) {
  return (
    <FormProductionOrderFixedRequirementSensoryCheck
      {...props}
      title="Kiểm tra cảm quan ống bẻ"
      requirementText={[
        "- Tần suất kiểm tra: 30 phút/lần.",
        "- Hình thức: Vỉ không được có ống bẩn, dính dịch, mờ date; không bị cắt lệch.",
        "- Khả năng bẻ ống: Ống bẻ được rời hẳn.",
      ].join("\n")}
      unitLabel="Ống bẻ"
      dosageFormStage="Ống bẻ"
      consoleErrorContext="ampoule sensory check"
    />
  );
}
