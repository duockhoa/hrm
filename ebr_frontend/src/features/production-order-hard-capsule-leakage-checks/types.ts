type HardCapsuleLeakageCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type HardCapsuleLeakageStage = "before_coating" | "after_coating";

type ProductionOrderHardCapsuleLeakageCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  stage?: string | null;
  tested_capsule_count?: number | string | null;
  leaked_capsule_count?: number | string | null;
  created_by_id?: number | string | null;
  checked_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: HardCapsuleLeakageCheckUser | null;
};

type HardCapsuleLeakageCheckPayload = {
  stage: HardCapsuleLeakageStage;
  tested_capsule_count: number;
  leaked_capsule_count: number;
};

export type {
  HardCapsuleLeakageCheckPayload,
  HardCapsuleLeakageCheckUser,
  HardCapsuleLeakageStage,
  ProductionOrderHardCapsuleLeakageCheck,
};
