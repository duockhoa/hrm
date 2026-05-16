export type ProductionOrderStageIdFilter =
  | number
  | string
  | Array<number | string>
  | null;

export class ExportProductionOrderLinesDto {
  stageId?: number | string | null;
  stageIds?: ProductionOrderStageIdFilter;
  StageID?: ProductionOrderStageIdFilter;
}
