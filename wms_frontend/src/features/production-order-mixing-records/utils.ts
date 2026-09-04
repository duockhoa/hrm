import type { MixingActivityTemplateCreator } from "@/features/mixing-activity-templates/types";
import type {
  ProductionOrderMixingRecord,
  ProductionOrderMixingRecordParameter,
  ProductionOrderMixingRecordStage,
  ProductionOrderMixingRecordStep,
} from "./types";

type RecordWithRelations = ProductionOrderMixingRecord & {
  mixingRecordStages?: ProductionOrderMixingRecordStage[];
  mixing_record_stages?: ProductionOrderMixingRecordStage[];
};

type StageWithRelations = ProductionOrderMixingRecordStage & {
  mixingRecordSteps?: ProductionOrderMixingRecordStep[];
  mixing_record_steps?: ProductionOrderMixingRecordStep[];
};

type StepWithRelations = ProductionOrderMixingRecordStep & {
  mixingRecordParameters?: ProductionOrderMixingRecordParameter[];
  mixing_record_parameters?: ProductionOrderMixingRecordParameter[];
};

export const getRecordStages = (record?: ProductionOrderMixingRecord | null) => {
  const source = record as RecordWithRelations | undefined | null;
  return [
    ...(source?.stages ??
      source?.mixingRecordStages ??
      source?.mixing_record_stages ??
      []),
  ].sort((left, right) => left.stage_order - right.stage_order);
};

export const getStageSteps = (stage: ProductionOrderMixingRecordStage) => {
  const source = stage as StageWithRelations;
  return [
    ...(source.steps ??
      source.mixingRecordSteps ??
      source.mixing_record_steps ??
      []),
  ].sort((left, right) => left.step_order - right.step_order);
};

export const getStepParameters = (step: ProductionOrderMixingRecordStep) => {
  const source = step as StepWithRelations;
  return [
    ...(source.parameters ??
      source.mixingRecordParameters ??
      source.mixing_record_parameters ??
      []),
  ].sort((left, right) => left.parameter_order - right.parameter_order);
};

export const getPersonLabel = (
  person?: MixingActivityTemplateCreator | null,
) =>
  person?.full_name ||
  person?.name ||
  person?.username ||
  person?.email ||
  "";

export const formatRecordDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
};

export const getRecordTemplate = (record: ProductionOrderMixingRecord) =>
  record.mixingActivityTemplate ?? record.mixing_activity_template ?? null;

export const getRecordVersion = (record: ProductionOrderMixingRecord) =>
  record.version ??
  record.template_version ??
  getRecordTemplate(record)?.version ??
  null;

export const getRecordBatchSize = (record: ProductionOrderMixingRecord) =>
  record.batch_size ??
  record.template_batch_size ??
  getRecordTemplate(record)?.batch_size ??
  null;

export const getRecordUnit = (record: ProductionOrderMixingRecord) =>
  record.unit_of_measure ??
  record.template_unit_of_measure ??
  getRecordTemplate(record)?.unit_of_measure ??
  "";

export const getRecordDescription = (record: ProductionOrderMixingRecord) =>
  record.description ?? "";
