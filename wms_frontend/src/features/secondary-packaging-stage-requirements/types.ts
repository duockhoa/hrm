type StageRequirementUser = {
  id?: string | number;
  name?: string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
};

type SecondaryPackagingStageRequirement = {
  id: number;
  stage: string;
  requirement: string;
  created_by_id?: string | number | null;
  createdBy?: StageRequirementUser | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SecondaryPackagingStageRequirementPayload = {
  stage: string;
  requirement: string;
};

export type {
  SecondaryPackagingStageRequirement,
  SecondaryPackagingStageRequirementPayload,
};
