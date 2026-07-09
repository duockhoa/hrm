import ExcelJS from 'exceljs';

type ProductionOrderLike = {
  PlannedQuantity?: unknown;
  [key: string]: unknown;
};

type ProductionOrderBatchSizeOptions = {
  formatQuantity?: boolean;
};

type CellCoordinate = {
  column: number;
  row: number;
};

type CellRange = {
  startColumn: number;
  startRow: number;
  endColumn: number;
  endRow: number;
};

const columnLettersToNumber = (columnLetters: string) =>
  Array.from(columnLetters).reduce(
    (columnNumber, character) =>
      columnNumber * 26 + character.toUpperCase().charCodeAt(0) - 64,
    0,
  );

const normalizeTemplateValue = (value: unknown): string | number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return String(value);
};

const getProductionOrderUnit = (productionOrder?: ProductionOrderLike) =>
  normalizeTemplateValue(
    productionOrder?.InventoryUOM ??
      productionOrder?.InventoryUoM ??
      productionOrder?.UoMCode ??
      productionOrder?.UomCode ??
      productionOrder?.UOM ??
      productionOrder?.Uom ??
      productionOrder?.Unit ??
      productionOrder?.unit,
  );

const parseNumberLike = (value: string) => {
  const trimmedValue = value.trim();
  const hasComma = trimmedValue.includes(',');
  const hasDot = trimmedValue.includes('.');
  let normalizedValue = trimmedValue;

  if (hasComma && hasDot) {
    normalizedValue = trimmedValue.replace(/,/g, '');
  } else if (hasComma) {
    normalizedValue = /^\d{1,3}(,\d{3})+$/.test(trimmedValue)
      ? trimmedValue.replace(/,/g, '')
      : trimmedValue.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(trimmedValue)) {
    normalizedValue = trimmedValue.replace(/\./g, '');
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatBatchQuantity = (value: string | number) => {
  const numericValue =
    typeof value === 'number' ? value : parseNumberLike(String(value));

  if (numericValue === null || !Number.isFinite(numericValue)) {
    return value;
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
  }).format(numericValue);
};

export const getProductionOrderBatchSize = (
  productionOrder?: ProductionOrderLike,
  options: ProductionOrderBatchSizeOptions = {},
) => {
  const plannedQuantity = normalizeTemplateValue(
    productionOrder?.PlannedQuantity,
  );
  const unit = getProductionOrderUnit(productionOrder);

  if (plannedQuantity === null) {
    return null;
  }

  const batchQuantity = options.formatQuantity
    ? formatBatchQuantity(plannedQuantity)
    : plannedQuantity;

  if (unit === null) {
    return batchQuantity;
  }

  return `${batchQuantity} ${unit}`;
};

const parseCellAddress = (address: string): CellCoordinate | null => {
  const match = /^([A-Z]+)(\d+)$/i.exec(address);

  if (!match) {
    return null;
  }

  return {
    column: columnLettersToNumber(match[1]),
    row: Number(match[2]),
  };
};

const parseCellRange = (range: string): CellRange | null => {
  const [startAddress, endAddress] = range.split(':');
  const start = parseCellAddress(startAddress);
  const end = parseCellAddress(endAddress ?? startAddress);

  if (!start || !end) {
    return null;
  }

  return {
    startColumn: start.column,
    startRow: start.row,
    endColumn: end.column,
    endRow: end.row,
  };
};

const getMergedCellRange = (
  worksheet: ExcelJS.Worksheet,
  row: number,
  column: number,
) => {
  for (const merge of worksheet.model.merges) {
    const range = parseCellRange(merge);

    if (
      range &&
      row >= range.startRow &&
      row <= range.endRow &&
      column >= range.startColumn &&
      column <= range.endColumn
    ) {
      return range;
    }
  }

  return undefined;
};

export const getCellAfterLabel = (
  worksheet: ExcelJS.Worksheet,
  label: string,
) => {
  const normalizedLabel = label.trim();

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    for (
      let columnNumber = 1;
      columnNumber <= worksheet.columnCount;
      columnNumber += 1
    ) {
      const cell = row.getCell(columnNumber);
      const cellValue = cell.value;

      if (
        typeof cellValue !== 'string' ||
        cellValue.trim() !== normalizedLabel
      ) {
        continue;
      }

      const mergedRange = getMergedCellRange(
        worksheet,
        rowNumber,
        columnNumber,
      );
      const targetColumn = (mergedRange?.endColumn ?? columnNumber) + 1;

      return worksheet.getCell(rowNumber, targetColumn);
    }
  }

  return null;
};
