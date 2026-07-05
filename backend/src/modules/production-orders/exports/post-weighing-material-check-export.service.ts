import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import path from 'node:path';
import type {
  ProductionOrderLineWithRelations,
  SapProductionOrderResponse,
} from '../production-orders.service';
import {
  getCellAfterLabel,
  getProductionOrderBatchSize,
} from './excel-template.util';

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const POST_WEIGHING_MATERIAL_CHECK_TEMPLATE_PATH = path.join(
  process.cwd(),
  'templates',
  'post-weighing-material-check-template',
  'post-weighing-material-check-template.xlsx',
);
const POST_WEIGHING_MATERIAL_CHECK_SHEET_NAME = 'Sheet1';
const POST_WEIGHING_MATERIAL_CHECK_DATA_START_ROW = 10;
const POST_WEIGHING_MATERIAL_CHECK_DATA_END_ROW = 115;
const POST_WEIGHING_MATERIAL_CHECK_DEFAULT_DATA_ROW_HEIGHT = 15;
const POST_WEIGHING_MATERIAL_CHECK_TEXT_LINE_HEIGHT = 12;
const POST_WEIGHING_MATERIAL_CHECK_ROW_VERTICAL_PADDING = 2;
const POST_WEIGHING_MATERIAL_CHECK_ROW_HEIGHT_BUFFER = 8;
const POST_WEIGHING_MATERIAL_CHECK_ITEM_NAME_USABLE_WIDTH_RATIO = 1.05;

type RowContentMeasure = {
  value: unknown;
  startColumn: number;
  endColumn: number;
  usableWidthRatio?: number;
};

type PostWeighingMaterialCheckLine = {
  itemNo: string | number | null;
  itemName: string | number | null;
  plannedQuantity: number;
  unitOfMeasurement: string | number | null;
  visualOrder: number;
};

const normalizeCellValue = (value: unknown): string | number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  return JSON.stringify(value);
};

const getLineValue = (line: ProductionOrderLineWithRelations, key: string) =>
  normalizeCellValue(line[key]);

const getNumberValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalizedValue = Number(value.replace(',', '.'));

    return Number.isFinite(normalizedValue) ? normalizedValue : 0;
  }

  return 0;
};

const formatDate = (value: unknown) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const roundQuantity = (value: number) => Number(value.toFixed(6));

const setCellValue = (
  worksheet: ExcelJS.Worksheet,
  address: string,
  value: unknown,
) => {
  worksheet.getCell(address).value = normalizeCellValue(value);
};

const setCellValueAfterLabel = (
  worksheet: ExcelJS.Worksheet,
  label: string,
  value: unknown,
) => {
  const targetCell = getCellAfterLabel(worksheet, label);

  if (targetCell) {
    targetCell.value = normalizeCellValue(value);
  }
};

const getColumnRangeWidth = (
  worksheet: ExcelJS.Worksheet,
  startColumn: number,
  endColumn: number,
) => {
  let width = 0;

  for (let column = startColumn; column <= endColumn; column += 1) {
    width += worksheet.getColumn(column).width ?? 8.43;
  }

  return width;
};

const getWrappedLineCount = (
  value: unknown,
  width: number,
  usableWidthRatio = 1,
) => {
  const normalizedValue = normalizeCellValue(value);

  if (normalizedValue === null || normalizedValue === '') {
    return 1;
  }

  const usableCharacterCount = Math.max(
    1,
    Math.floor(width * usableWidthRatio),
  );

  return String(normalizedValue)
    .split(/\r?\n/)
    .reduce(
      (lineCount, line) =>
        lineCount +
        Math.max(1, Math.ceil(Array.from(line).length / usableCharacterCount)),
      0,
    );
};

const getDataRowHeight = (
  worksheet: ExcelJS.Worksheet,
  contents: RowContentMeasure[],
) => {
  const maxLineCount = Math.max(
    ...contents.map((content) =>
      getWrappedLineCount(
        content.value,
        getColumnRangeWidth(worksheet, content.startColumn, content.endColumn),
        content.usableWidthRatio,
      ),
    ),
  );

  return (
    Math.max(
      POST_WEIGHING_MATERIAL_CHECK_DEFAULT_DATA_ROW_HEIGHT,
      maxLineCount * POST_WEIGHING_MATERIAL_CHECK_TEXT_LINE_HEIGHT +
        POST_WEIGHING_MATERIAL_CHECK_ROW_VERTICAL_PADDING,
    ) + POST_WEIGHING_MATERIAL_CHECK_ROW_HEIGHT_BUFFER
  );
};

const applyDataRowLayout = (
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  contents: RowContentMeasure[],
) => {
  const row = worksheet.getRow(rowNumber);
  const rowHeight = getDataRowHeight(worksheet, contents);

  row.height = rowHeight;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.style = {
      ...cell.style,
      alignment: {
        ...cell.alignment,
        vertical: 'middle',
        wrapText: true,
      },
    };
  });

  applyCellAlignment(worksheet, rowNumber, 2, 3, { horizontal: 'center' });
  applyCellAlignment(worksheet, rowNumber, 4, 8, { horizontal: 'left' });
  applyCellAlignment(worksheet, rowNumber, 9, 15, { horizontal: 'center' });
};

const applyCellAlignment = (
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  startColumn: number,
  endColumn: number,
  alignment: Partial<ExcelJS.Alignment>,
) => {
  for (let column = startColumn; column <= endColumn; column += 1) {
    const cell = worksheet.getCell(rowNumber, column);

    cell.style = {
      ...cell.style,
      alignment: {
        ...cell.alignment,
        ...alignment,
      },
    };
  }
};

const getPostWeighingMaterialCheckLines = (
  lines: ProductionOrderLineWithRelations[],
) => {
  const groupedLinesByItemNo = new Map<string, PostWeighingMaterialCheckLine>();
  let fallbackLineKey = 0;

  for (const line of lines) {
    if (line.ItemType !== 'pit_Item') {
      continue;
    }

    const itemNo = getLineValue(line, 'ItemNo');
    const groupKey =
      itemNo === null || itemNo === ''
        ? `__line_${fallbackLineKey++}`
        : String(itemNo);
    const plannedQuantity = getNumberValue(line.PlannedQuantity);
    const visualOrder = getNumberValue(line.VisualOrder);
    const unitOfMeasurement = normalizeCellValue(
      line.UnitOfMeasurement?.Code ?? line.UoMCode,
    );
    const existingLine = groupedLinesByItemNo.get(groupKey);

    if (!existingLine) {
      groupedLinesByItemNo.set(groupKey, {
        itemNo,
        itemName: getLineValue(line, 'ItemName'),
        plannedQuantity,
        unitOfMeasurement,
        visualOrder,
      });
      continue;
    }

    existingLine.plannedQuantity = roundQuantity(
      existingLine.plannedQuantity + plannedQuantity,
    );
    existingLine.visualOrder = Math.min(existingLine.visualOrder, visualOrder);

    if (!existingLine.itemName) {
      existingLine.itemName = getLineValue(line, 'ItemName');
    }

    if (!existingLine.unitOfMeasurement) {
      existingLine.unitOfMeasurement = unitOfMeasurement;
    }
  }

  return Array.from(groupedLinesByItemNo.values())
    .map((line) => ({
      ...line,
      plannedQuantity: roundQuantity(line.plannedQuantity),
    }))
    .sort(
      (firstLine, secondLine) => firstLine.visualOrder - secondLine.visualOrder,
    );
};

const sanitizeFilenamePart = (value: unknown) => {
  const normalizedValue = normalizeCellValue(value);

  if (normalizedValue === null || normalizedValue === '') {
    return '';
  }

  return String(normalizedValue)
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getPostWeighingMaterialCheckFilename = (
  productionOrderId: number,
  productionOrder?: SapProductionOrderResponse,
) => {
  const productDescription = sanitizeFilenamePart(
    productionOrder?.ProductDescription,
  );
  const batchNumber = sanitizeFilenamePart(productionOrder?.U_SL);
  const filenameParts = [
    'Phieu kiem tra sau can',
    productDescription,
    batchNumber,
  ].filter(Boolean);

  if (filenameParts.length === 1) {
    filenameParts.push(String(productionOrderId));
  }

  return `${filenameParts.join(' ')}.xlsx`;
};

@Injectable()
export class PostWeighingMaterialCheckExportService {
  async export(
    productionOrderId: number,
    lines: ProductionOrderLineWithRelations[],
    productionOrder?: SapProductionOrderResponse,
  ) {
    const postWeighingLines = getPostWeighingMaterialCheckLines(lines);
    const maxDataRows =
      POST_WEIGHING_MATERIAL_CHECK_DATA_END_ROW -
      POST_WEIGHING_MATERIAL_CHECK_DATA_START_ROW +
      1;

    if (postWeighingLines.length > maxDataRows) {
      throw new BadRequestException(
        `Production order ${productionOrderId} has ${postWeighingLines.length} material lines after grouping, but the post-weighing material check template supports only ${maxDataRows} lines.`,
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(POST_WEIGHING_MATERIAL_CHECK_TEMPLATE_PATH);
    const worksheet =
      workbook.getWorksheet(POST_WEIGHING_MATERIAL_CHECK_SHEET_NAME) ??
      workbook.worksheets[0];

    workbook.creator = 'HRM';
    workbook.modified = new Date();

    worksheet.pageSetup = {
      ...worksheet.pageSetup,
      paperSize: 9,
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '8:9',
    };

    setCellValue(worksheet, 'D5', productionOrder?.ProductDescription);
    setCellValueAfterLabel(worksheet, 'Số lô:', productionOrder?.U_SL);
    setCellValue(worksheet, 'D6', getProductionOrderBatchSize(productionOrder));

    for (const [index, line] of postWeighingLines.entries()) {
      const rowNumber = POST_WEIGHING_MATERIAL_CHECK_DATA_START_ROW + index;

      setCellValue(worksheet, `B${rowNumber}`, line.itemNo);
      setCellValue(worksheet, `D${rowNumber}`, line.itemName);
      setCellValue(worksheet, `I${rowNumber}`, line.plannedQuantity);
      setCellValue(worksheet, `L${rowNumber}`, line.unitOfMeasurement);
      setCellValue(worksheet, `M${rowNumber}`, null);

      applyDataRowLayout(worksheet, rowNumber, [
        { value: line.itemNo, startColumn: 2, endColumn: 3 },
        {
          value: line.itemName,
          startColumn: 4,
          endColumn: 8,
          usableWidthRatio:
            POST_WEIGHING_MATERIAL_CHECK_ITEM_NAME_USABLE_WIDTH_RATIO,
        },
        { value: line.plannedQuantity, startColumn: 9, endColumn: 11 },
        { value: line.unitOfMeasurement, startColumn: 12, endColumn: 12 },
      ]);
    }

    for (
      let rowNumber =
        POST_WEIGHING_MATERIAL_CHECK_DATA_START_ROW + postWeighingLines.length;
      rowNumber <= POST_WEIGHING_MATERIAL_CHECK_DATA_END_ROW;
      rowNumber += 1
    ) {
      worksheet.getRow(rowNumber).hidden = true;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      contentType: EXCEL_MIME_TYPE,
      filename: getPostWeighingMaterialCheckFilename(
        productionOrderId,
        productionOrder,
      ),
    };
  }
}
