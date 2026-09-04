export type MixingActivityTemplateCreator = {
  id?: string | number;
  name?: string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

export type MixingActivityTemplateItem = {
  item_code: string;
  item_name?: string | null;
  unit?: string | null;
  dk_code?: string | null;
  registration_id?: number | null;
  created_at?: string | null;
  update_at?: string | null;
  updated_at?: string | null;
};

export type MixingActivityTemplate = {
  id: number;
  item_code?: string;
  version: number;
  batch_size: number | string;
  unit_of_measure: string;
  description?: string | null;
  item?: MixingActivityTemplateItem | null;
  created_by_id?: string | number | null;
  createdBy?: MixingActivityTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateMixingActivityTemplatePayload = {
  version?: number;
  batch_size: number;
  unit_of_measure: string;
  description?: string | null;
};

export type UpdateMixingActivityTemplatePayload = Partial<
  CreateMixingActivityTemplatePayload
>;

export type MixingActivityTemplateStage = {
  id: number;
  mixing_activity_template_id?: number;
  stage_name: string;
  stage_order: number;
  created_by_id?: string | number | null;
  createdBy?: MixingActivityTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateMixingActivityTemplateStagePayload = {
  stage_name: string;
  stage_order: number;
};

export type UpdateMixingActivityTemplateStagePayload = Partial<
  CreateMixingActivityTemplateStagePayload
>;

export type MixingActivityTemplateStageStep = {
  id: number;
  mixing_activity_template_stage_id?: number;
  step_name: string;
  step_order: number;
  created_by_id?: string | number | null;
  createdBy?: MixingActivityTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateMixingActivityTemplateStageStepPayload = {
  step_name: string;
  step_order: number;
};

export type UpdateMixingActivityTemplateStageStepPayload = Partial<
  CreateMixingActivityTemplateStageStepPayload
>;

export const MIXING_ACTIVITY_PARAMETER_DATA_TYPES = [
  "text",
  "number",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "select",
] as const;

export type MixingActivityParameterDataType =
  (typeof MIXING_ACTIVITY_PARAMETER_DATA_TYPES)[number];

export const MIXING_ACTIVITY_PARAMETER_UNITS = [
  "kg",
  "g",
  "lít",
  "ml",
  "h",
  "phút",
  "Độ C",
  "Hz",
  "Vòng/phút",
  "%",
  "ppm",
] as const;

export type MixingActivityTemplateStageStepParameter = {
  id: number;
  mixing_activity_template_stage_step_id?: number;
  parameter_name: string;
  data_type: MixingActivityParameterDataType;
  unit?: string | null;
  requirement: string;
  parameter_order: number;
  created_by_id?: string | number | null;
  createdBy?: MixingActivityTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateMixingActivityTemplateStageStepParameterPayload = {
  parameter_name: string;
  data_type: MixingActivityParameterDataType;
  unit?: string | null;
  requirement: string;
  parameter_order: number;
};

export type UpdateMixingActivityTemplateStageStepParameterPayload = Partial<
  CreateMixingActivityTemplateStageStepParameterPayload
>;
