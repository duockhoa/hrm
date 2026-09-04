export type ProductionOrderLine = {
  LineNumber?: number | string | null;
  ItemNo?: string | null;
  ItemName?: string | null;
  U_SL?: string | null;
  U_HSD?: string | null;
  Warehouse?: string | null;
  PlannedQuantity?: number | string | null;
  IssuedQuantity?: number | string | null;
  UnitOfMeasurement?: {
    Code?: string | number | null;
    Name?: string | null;
  } | null;
  ProductionOrdersStage?: {
    Name?: string | null;
    SequenceNumber?: number | string | null;
  } | null;
  [key: string]: unknown;
};

export type ProductionOrderMaterialSummary = {
  id?: number | string;
  production_order_id?: number | string | null;
  material_code?: string | null;
  material_name?: string | null;
  lot_no?: string | null;
  unit?: string | null;
  received_quantity?: number | string | null;
  used_quantity?: number | string | null;
  supplier_waste_quantity?: number | string | null;
  production_waste_quantity?: number | string | null;
  remaining_quantity?: number | string | null;
  sample_quantity?: number | string | null;
  summarized_by_id?: number | string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  material?: {
    item_code?: string | null;
    item_name?: string | null;
    unit?: string | null;
  } | null;
  summarizedBy?: {
    id?: number | string;
    username?: string | null;
    name?: string | null;
    email?: string | null;
    department?: string | null;
    position?: string | null;
  } | null;
  createdBy?: {
    id?: number | string;
    username?: string | null;
    name?: string | null;
    email?: string | null;
    department?: string | null;
    position?: string | null;
  } | null;
};

export type ProductionOrderMaterialSummaryPayload = {
  material_code: string;
  lot_no?: string | null;
  received_quantity?: string | number | null;
  used_quantity?: string | number | null;
  supplier_waste_quantity?: string | number | null;
  production_waste_quantity?: string | number | null;
  remaining_quantity?: string | number | null;
  sample_quantity?: string | number | null;
  summarized_by_id?: string | number | null;
};

export const createProductionOrderLineDetailId = (
  productionOrderId: string | number,
  lineIndex: number,
) => `${encodeURIComponent(String(productionOrderId))}:${lineIndex}`;

export const parseProductionOrderLineDetailId = (value: string | number) => {
  const [encodedProductionOrderId, lineIndexText] = String(value).split(":");
  const lineIndex = Number(lineIndexText);

  if (
    !encodedProductionOrderId ||
    !Number.isInteger(lineIndex) ||
    lineIndex < 0
  ) {
    return null;
  }

  return {
    productionOrderId: decodeURIComponent(encodedProductionOrderId),
    lineIndex,
  };
};

export const formatNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN");
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
};

export const formatText = (
  value: string | number | boolean | null | undefined,
) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

export const getProductionOrderLineStage = (line: ProductionOrderLine) =>
  line.ProductionOrdersStage?.Name ??
  line.ProductionOrdersStage?.SequenceNumber ??
  "";

export const getProductionOrderLineUnit = (line: ProductionOrderLine) =>
  line.UnitOfMeasurement?.Name ?? line.UnitOfMeasurement?.Code ?? "";

export const normalizeNullableText = (
  value: string | number | null | undefined,
) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

export const getProductionOrderLineMaterialCode = (line: ProductionOrderLine) =>
  normalizeNullableText(line.ItemNo);

export const getProductionOrderLineLotNo = (line: ProductionOrderLine) =>
  normalizeNullableText(line.U_SL);

export const findMaterialSummaryForLine = (
  line: ProductionOrderLine,
  summaries: ProductionOrderMaterialSummary[] | undefined,
) => {
  const materialCode = getProductionOrderLineMaterialCode(line);
  const lotNo = getProductionOrderLineLotNo(line);

  return summaries?.find(
    (summary) =>
      normalizeNullableText(summary.material_code) === materialCode &&
      normalizeNullableText(summary.lot_no) === lotNo,
  );
};
