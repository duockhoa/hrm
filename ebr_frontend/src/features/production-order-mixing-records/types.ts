import type {
  MixingActivityParameterDataType,
  MixingActivityTemplate,
  MixingActivityTemplateCreator,
} from "@/features/mixing-activity-templates/types";

export type ProductionOrderMixingRecordParameter = {
  id: number;
  production_order_mixing_record_step_id?: number;
  source_template_parameter_id?: number | null;
  parameter_name: string;
  data_type: MixingActivityParameterDataType;
  unit?: string | null;
  requirement: string;
  parameter_order: number;
  result_value?: string | number | boolean | null;
  note?: string | null;
  result_image_path?: string | null;
  recorded_by_id?: string | number | null;
  recordedBy?: MixingActivityTemplateCreator | null;
  recorded_by?: MixingActivityTemplateCreator | null;
  recorded_at?: string | null;
};

export type ProductionOrderMixingRecordStep = {
  id: number;
  production_order_mixing_record_stage_id?: number;
  source_template_step_id?: number | null;
  step_name: string;
  step_order: number;
  parameters?: ProductionOrderMixingRecordParameter[];
};

export type ProductionOrderMixingRecordStage = {
  id: number;
  production_order_mixing_record_id?: number;
  source_template_stage_id?: number | null;
  stage_name: string;
  stage_order: number;
  steps?: ProductionOrderMixingRecordStep[];
};

export type ProductionOrderMixingRecord = {
  id: number;
  production_order_id?: string | number;
  mixing_activity_template_id?: number | null;
  item_code?: string | null;
  version?: number | null;
  template_version?: number | null;
  batch_size?: number | string | null;
  template_batch_size?: number | string | null;
  unit_of_measure?: string | null;
  template_unit_of_measure?: string | null;
  description?: string | null;
  template_description?: string | null;
  created_by_id?: string | number | null;
  createdBy?: MixingActivityTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
  qa_staff_approved_by_id?: string | number | null;
  qa_staff_approved_at?: string | null;
  qaStaffApprovedBy?: MixingActivityTemplateCreator | null;
  qa_staff_approved_by?: MixingActivityTemplateCreator | null;
  ipc_staff_approved_by_id?: string | number | null;
  ipc_staff_approved_at?: string | null;
  ipcStaffApprovedBy?: MixingActivityTemplateCreator | null;
  stages?: ProductionOrderMixingRecordStage[];
  mixingActivityTemplate?: MixingActivityTemplate | null;
  mixing_activity_template?: MixingActivityTemplate | null;
};

export type CreateProductionOrderMixingRecordPayload = {
  mixing_activity_template_id: number;
  description?: string | null;
};

export type UpdateProductionOrderMixingRecordPayload = {
  description?: string | null;
};

export type UpdateProductionOrderMixingRecordResultPayload = {
  result_value?: string | number | boolean | null;
  note?: string | null;
  result_image_path?: string | null;
};
