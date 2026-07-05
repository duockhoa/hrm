import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import path from 'node:path';
import type {
  ProductionOrderLineWithRelations,
  SapProductionOrderResponse,
} from '../production-orders.service';

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const WEIGHING_TICKET_TEMPLATE_PATH = path.join(
  process.cwd(),
  'templates',
  'weighing_ticket_template',
  'WeighingTicketTemplate.xlsx',
);
const WEIGHING_TICKET_SHEET_NAME = 'Sheet1';
const WEIGHING_TICKET_DATA_START_ROW = 12;
const WEIGHING_TICKET_DATA_END_ROW = 116;
const WEIGHING_TICKET_DEFAULT_DATA_ROW_HEIGHT = 13.9;
const WEIGHING_TICKET_TEXT_LINE_HEIGHT = 12;
const WEIGHING_TICKET_ROW_VERTICAL_PADDING = 2;
const WEIGHING_TICKET_ROW_HEIGHT_BUFFER = 8;
const WEIGHING_TICKET_ITEM_NAME_USABLE_WIDTH_RATIO = 1.05;
const WEIGHING_TICKET_BATCH_NUMBER_USABLE_WIDTH_RATIO = 1.05;

type RowContentMeasure = {
  value: unknown;
  startColumn: number;
  endColumn: number;
  usableWidthRatio?: number;
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

const setCellValue = (
  worksheet: ExcelJS.Worksheet,
  address: string,
  value: unknown,
) => {
  worksheet.getCell(address).value = normalizeCellValue(value);
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
      WEIGHING_TICKET_DEFAULT_DATA_ROW_HEIGHT,
      maxLineCount * WEIGHING_TICKET_TEXT_LINE_HEIGHT +
        WEIGHING_TICKET_ROW_VERTICAL_PADDING,
    ) + WEIGHING_TICKET_ROW_HEIGHT_BUFFER
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

  applyCellAlignment(worksheet, rowNumber, 2, 2, { horizontal: 'center' });
  applyCellAlignment(worksheet, rowNumber, 3, 6, { horizontal: 'left' });
  applyCellAlignment(worksheet, rowNumber, 7, 13, { horizontal: 'center' });
  applyCellAlignment(worksheet, rowNumber, 14, 15, { horizontal: 'center' });
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

const getWeighingTicketLines = (lines: ProductionOrderLineWithRelations[]) =>
  lines
    .filter((line) => line.ItemType === 'pit_Item')
    .sort(
      (firstLine, secondLine) =>
        getNumberValue(firstLine.VisualOrder) -
        getNumberValue(secondLine.VisualOrder),
    );

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

const getWeighingTicketFilename = (
  productionOrderId: number,
  productionOrder?: SapProductionOrderResponse,
) => {
  const productDescription = sanitizeFilenamePart(
    productionOrder?.ProductDescription,
  );
  const batchNumber = sanitizeFilenamePart(productionOrder?.U_SL);
  const filenameParts = ['Phieu can', productDescription, batchNumber].filter(
    Boolean,
  );

  if (filenameParts.length === 1) {
    filenameParts.push(String(productionOrderId));
  }

  return `${filenameParts.join(' ')}.xlsx`;
};

@Injectable()
export class WeighingTicketExportService {
  async export(
    productionOrderId: number,
    lines: ProductionOrderLineWithRelations[],
    productionOrder?: SapProductionOrderResponse,
  ) {
    const weighingTicketLines = getWeighingTicketLines(lines);
    const maxDataRows =
      WEIGHING_TICKET_DATA_END_ROW - WEIGHING_TICKET_DATA_START_ROW + 1;

    if (weighingTicketLines.length > maxDataRows) {
      throw new BadRequestException(
        `Production order ${productionOrderId} has ${weighingTicketLines.length} item lines, but the weighing ticket template supports only ${maxDataRows} lines.`,
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(WEIGHING_TICKET_TEMPLATE_PATH);
    const worksheet =
      workbook.getWorksheet(WEIGHING_TICKET_SHEET_NAME) ??
      workbook.worksheets[0];

    workbook.creator = 'HRM';
    workbook.modified = new Date();

    worksheet.pageSetup = {
      ...worksheet.pageSetup,
      paperSize: 9,
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '10:11',
    };

    setCellValue(worksheet, 'D5', productionOrder?.ProductDescription);
    setCellValue(worksheet, 'L5', productionOrder?.U_SL);
    setCellValue(worksheet, 'D6', productionOrder?.PlannedQuantity);

    for (const [index, line] of weighingTicketLines.entries()) {
      const rowNumber = WEIGHING_TICKET_DATA_START_ROW + index;
      const plannedQuantity = getNumberValue(line.PlannedQuantity);
      const itemNo = getLineValue(line, 'ItemNo');
      const itemName = getLineValue(line, 'ItemName');
      const batchNumber = getLineValue(line, 'U_SL');
      const unitOfMeasurement = normalizeCellValue(
        line.UnitOfMeasurement?.Code ?? line.UoMCode,
      );

      setCellValue(worksheet, `B${rowNumber}`, itemNo);
      setCellValue(worksheet, `C${rowNumber}`, itemName);
      setCellValue(worksheet, `G${rowNumber}`, batchNumber);
      setCellValue(worksheet, `K${rowNumber}`, plannedQuantity);
      setCellValue(worksheet, `M${rowNumber}`, unitOfMeasurement);
      setCellValue(worksheet, `N${rowNumber}`, null);

      applyDataRowLayout(worksheet, rowNumber, [
        { value: itemNo, startColumn: 2, endColumn: 2 },
        {
          value: itemName,
          startColumn: 3,
          endColumn: 6,
          usableWidthRatio: WEIGHING_TICKET_ITEM_NAME_USABLE_WIDTH_RATIO,
        },
        {
          value: batchNumber,
          startColumn: 7,
          endColumn: 10,
          usableWidthRatio: WEIGHING_TICKET_BATCH_NUMBER_USABLE_WIDTH_RATIO,
        },
        { value: plannedQuantity, startColumn: 11, endColumn: 12 },
        { value: unitOfMeasurement, startColumn: 13, endColumn: 13 },
      ]);
    }

    for (
      let rowNumber =
        WEIGHING_TICKET_DATA_START_ROW + weighingTicketLines.length;
      rowNumber <= WEIGHING_TICKET_DATA_END_ROW;
      rowNumber += 1
    ) {
      worksheet.getRow(rowNumber).hidden = true;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      contentType: EXCEL_MIME_TYPE,
      filename: getWeighingTicketFilename(productionOrderId, productionOrder),
    };
  }
}
