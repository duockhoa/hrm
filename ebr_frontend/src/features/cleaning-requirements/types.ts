export const CLEANING_REQUIREMENT_TYPES = [
  "Đầu ca",
  "Cuối ca",
  "Định kỳ",
] as const;

export type CleaningRequirementType =
  (typeof CLEANING_REQUIREMENT_TYPES)[number];

export type CleaningCreatedBy = {
  id: number;
  username: string;
  name?: string | null;
  email?: string | null;
};

export type CleaningRequirement = {
  id: number;
  cleaning_object_id: number;
  requirement_type: string;
  requirement_content: string;
  created_by_id?: number;
  createdBy?: CleaningCreatedBy;
  created_at?: string;
  updated_at?: string;
};

export type CleaningObject = {
  id: number;
  name: string;
  qr_code: string;
  created_by_id?: number;
  createdBy?: CleaningCreatedBy;
  cleaningRequirements?: CleaningRequirement[];
  cleaning_requirements_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type CreateCleaningObjectPayload = {
  name: string;
  qr_code: string;
};

export type UpdateCleaningObjectPayload =
  Partial<CreateCleaningObjectPayload>;

export type CreateCleaningRequirementPayload = {
  cleaning_object_id: number;
  requirement_type: CleaningRequirementType;
  requirement_content: string;
};

export type UpdateCleaningRequirementPayload =
  Partial<CreateCleaningRequirementPayload>;

export type CleaningObjectWithRequirements = CleaningObject & {
  cleaningRequirements: CleaningRequirement[];
};
