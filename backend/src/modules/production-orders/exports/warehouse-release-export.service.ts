import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import path from 'node:path';
import type {
  ProductionOrderLineWithRelations,
  SapProductionOrderResponse,
} from '../production-orders.service';

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const WAREHOUSE_RELEASE_TEMPLATE_PATH = path.join(
  process.cwd(),
  'templates',
  'phieu-xuat-kho-template',
  'warehouse-release-form-template.xlsx',
);
const WAREHOUSE_RELEASE_SHEET_NAME = 'Page1';
const WAREHOUSE_RELEASE_DATA_START_ROW = 16;
const WAREHOUSE_RELEASE_DATA_END_ROW = 113;
const WAREHOUSE_RELEASE_DEFAULT_DATA_ROW_HEIGHT = 18;
const WAREHOUSE_RELEASE_TEXT_LINE_HEIGHT = 12;
const WAREHOUSE_RELEASE_ROW_VERTICAL_PADDING = 2;
const WAREHOUSE_RELEASE_USABLE_WIDTH_RATIO = 1.35;

type RowContentMeasure = {
  value: unknown;
  startColumn: number;
  endColumn: number;
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

const formatVietnameseDate = (value: unknown) => {
  const formattedDate = formatDate(value || new Date());
  const [day, month, year] = formattedDate.split('/');

  if (!day || !month || !year) {
    return formattedDate;
  }

  return `Ngày ${day} tháng ${month} năm ${year}`;
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

const getWrappedLineCount = (value: unknown, width: number) => {
  const normalizedValue = normalizeCellValue(value);

  if (normalizedValue === null || normalizedValue === '') {
    return 1;
  }

  const usableCharacterCount = Math.max(
    1,
    Math.floor(width * WAREHOUSE_RELEASE_USABLE_WIDTH_RATIO),
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
      ),
    ),
  );

  return Math.max(
    WAREHOUSE_RELEASE_DEFAULT_DATA_ROW_HEIGHT,
    maxLineCount * WAREHOUSE_RELEASE_TEXT_LINE_HEIGHT +
      WAREHOUSE_RELEASE_ROW_VERTICAL_PADDING,
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
    cell.alignment = {
      ...cell.alignment,
      vertical: 'top',
      wrapText: true,
    };
  });

  return rowHeight;
};

const getWarehouseReleaseLines = (lines: ProductionOrderLineWithRelations[]) =>
  lines
    .filter((line) => line.ItemType === 'pit_Item')
    .sort(
      (firstLine, secondLine) =>
        getNumberValue(firstLine.VisualOrder) -
        getNumberValue(secondLine.VisualOrder),
    );

const getWarehouseReleaseNumber = (
  productionOrderId: number,
  productionOrder?: SapProductionOrderResponse,
) =>
  normalizeCellValue(productionOrder?.U_MLSX) ??
  normalizeCellValue(productionOrder?.DocumentNumber) ??
  normalizeCellValue(productionOrder?.AbsoluteEntry) ??
  productionOrderId;

const getWarehouseReleaseReason = (
  productionOrder?: SapProductionOrderResponse,
) => {
  const productDescription =
    normalizeCellValue(productionOrder?.ProductDescription) ?? '';
  const plannedQuantity =
    normalizeCellValue(productionOrder?.PlannedQuantity) ?? '';
  const itemNo = normalizeCellValue(productionOrder?.ItemNo) ?? '';
  const batchNumber = normalizeCellValue(productionOrder?.U_SL) ?? '';

  return `- Lý do xuất: Xuất cho sản xuất ${productDescription} (${plannedQuantity}) ${itemNo} - ${batchNumber}`;
};

@Injectable()
export class WarehouseReleaseExportService {
  async export(
    productionOrderId: number,
    lines: ProductionOrderLineWithRelations[],
    productionOrder?: SapProductionOrderResponse,
  ) {
    const warehouseReleaseLines = getWarehouseReleaseLines(lines);
    const maxDataRows =
      WAREHOUSE_RELEASE_DATA_END_ROW - WAREHOUSE_RELEASE_DATA_START_ROW + 1;

    if (warehouseReleaseLines.length > maxDataRows) {
      throw new BadRequestException(
        `Production order ${productionOrderId} has ${warehouseReleaseLines.length} item lines, but the warehouse release template supports only ${maxDataRows} lines.`,
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(WAREHOUSE_RELEASE_TEMPLATE_PATH);
    const worksheet =
      workbook.getWorksheet(WAREHOUSE_RELEASE_SHEET_NAME) ??
      workbook.worksheets[0];

    workbook.creator = 'HRM';
    workbook.modified = new Date();

    worksheet.pageSetup = {
      ...worksheet.pageSetup,
      paperSize: 9,
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '14:15',
    };

    const issueDate =
      warehouseReleaseLines[0]?.StartDate ?? warehouseReleaseLines[0]?.EndDate;
    const warehouse = warehouseReleaseLines[0]?.Warehouse;

    setCellValue(worksheet, 'K6', formatVietnameseDate(issueDate));
    setCellValue(
      worksheet,
      'K7',
      `Số: ${getWarehouseReleaseNumber(productionOrderId, productionOrder)}`,
    );
    setCellValue(worksheet, 'A11', getWarehouseReleaseReason(productionOrder));
    setCellValue(
      worksheet,
      'A12',
      `- Xuất tại kho (ngăn lô): ${warehouse ?? ''}`,
    );

    for (const [index, line] of warehouseReleaseLines.entries()) {
      const rowNumber = WAREHOUSE_RELEASE_DATA_START_ROW + index;
      const plannedQuantity = getNumberValue(line.PlannedQuantity);
      const itemNo = getLineValue(line, 'ItemNo');
      const itemName = getLineValue(line, 'ItemName');
      const batchNumber = getLineValue(line, 'U_SL');
      const expiryDate = formatDate(line.U_HSD);
      const warehouseCode = getLineValue(line, 'Warehouse');
      const unitOfMeasurement = normalizeCellValue(
        line.UnitOfMeasurement?.Code ?? line.UoMCode,
      );
      const lineText = getLineValue(line, 'LineText');

      setCellValue(worksheet, `A${rowNumber}`, index + 1);
      setCellValue(worksheet, `B${rowNumber}`, itemNo);
      setCellValue(worksheet, `D${rowNumber}`, itemName);
      setCellValue(worksheet, `H${rowNumber}`, batchNumber);
      setCellValue(worksheet, `J${rowNumber}`, expiryDate);
      setCellValue(worksheet, `L${rowNumber}`, warehouseCode);
      setCellValue(worksheet, `N${rowNumber}`, unitOfMeasurement);
      setCellValue(worksheet, `O${rowNumber}`, plannedQuantity);
      setCellValue(worksheet, `Q${rowNumber}`, null);
      setCellValue(worksheet, `T${rowNumber}`, null);
      setCellValue(worksheet, `X${rowNumber}`, lineText);
      setCellValue(worksheet, `AB${rowNumber}`, null);

      applyDataRowLayout(worksheet, rowNumber, [
        { value: index + 1, startColumn: 1, endColumn: 1 },
        { value: itemNo, startColumn: 2, endColumn: 3 },
        { value: itemName, startColumn: 4, endColumn: 7 },
        { value: batchNumber, startColumn: 8, endColumn: 9 },
        { value: expiryDate, startColumn: 10, endColumn: 11 },
        { value: warehouseCode, startColumn: 12, endColumn: 13 },
        { value: unitOfMeasurement, startColumn: 14, endColumn: 14 },
        { value: plannedQuantity, startColumn: 15, endColumn: 16 },
        { value: lineText, startColumn: 24, endColumn: 27 },
      ]);
    }

    for (
      let rowNumber =
        WAREHOUSE_RELEASE_DATA_START_ROW + warehouseReleaseLines.length;
      rowNumber <= WAREHOUSE_RELEASE_DATA_END_ROW;
      rowNumber += 1
    ) {
      worksheet.getRow(rowNumber).hidden = true;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      contentType: EXCEL_MIME_TYPE,
      filename: `warehouse-release-order-${productionOrderId}.xlsx`,
    };
  }
}
