import { Injectable } from '@nestjs/common';
import type { Items, ProductionOrders } from '@prisma/client';
import Docxtemplater from 'docxtemplater';
import fs from 'node:fs/promises';
import path from 'node:path';
import PizZip from 'pizzip';

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const PRODUCTION_ORDER_TEMPLATE_DIR = path.join(
  process.cwd(),
  'templates',
  'production-order-template',
);

const FINISHED_PRODUCT_PRODUCTION_ORDER_TEMPLATE_PATH = path.join(
  PRODUCTION_ORDER_TEMPLATE_DIR,
  'production-order-finished-product-form-template.docx',
);

const SEMI_FINISHED_PRODUCT_PRODUCTION_ORDER_TEMPLATE_PATH = path.join(
  PRODUCTION_ORDER_TEMPLATE_DIR,
  'production-order-semi-finished-product-form-template.docx',
);

type ProductionOrderForExport = ProductionOrders & {
  item?: Items | null;
};

const normalizeTemplateValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  return String(value);
};

const formatDate = (value: Date) => {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const year = value.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const formatShortDateParts = (day: string, month: string, year: string) => {
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (
    !Number.isInteger(dayNumber) ||
    !Number.isInteger(monthNumber) ||
    !Number.isInteger(yearNumber) ||
    dayNumber < 1 ||
    dayNumber > 31 ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return null;
  }

  return `${day.padStart(2, '0')}${month.padStart(2, '0')}${year.slice(-2)}`;
};

const formatShortDate = (value: unknown) => {
  const normalizedValue = normalizeTemplateValue(value).trim();

  if (!normalizedValue) {
    return '';
  }

  if (/^\d{6}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const compactValue = normalizedValue.replace(/\D/g, '');

  if (/^\d{8}$/.test(compactValue)) {
    const parsedDate =
      compactValue.startsWith('19') || compactValue.startsWith('20')
        ? formatShortDateParts(
            compactValue.slice(6, 8),
            compactValue.slice(4, 6),
            compactValue.slice(0, 4),
          )
        : formatShortDateParts(
            compactValue.slice(0, 2),
            compactValue.slice(2, 4),
            compactValue.slice(4, 8),
          );

    if (parsedDate) {
      return parsedDate;
    }
  }

  const date = value instanceof Date ? value : new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return normalizedValue;
  }

  const formattedDate = formatShortDateParts(
    String(date.getUTCDate()),
    String(date.getUTCMonth() + 1),
    String(date.getUTCFullYear()),
  );

  return formattedDate ?? normalizedValue;
};

const formatBatchQuantity = (value: unknown) => {
  const normalizedValue = normalizeTemplateValue(value).trim();
  const numericValue =
    typeof value === 'number'
      ? value
      : Number(normalizedValue.replace(/\./g, '').replace(',', '.'));

  if (!Number.isFinite(numericValue)) {
    return normalizedValue;
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 6,
  }).format(numericValue);
};

const getBatchSize = (productionOrder: ProductionOrderForExport) => {
  const quantity = formatBatchQuantity(productionOrder.planned_quatity);
  const unit = normalizeTemplateValue(productionOrder.unit)
    .trim()
    .toLocaleLowerCase('vi-VN');

  return [quantity, unit].filter(Boolean).join(' ');
};

const sanitizeFilenamePart = (value: unknown) => {
  const normalizedValue = normalizeTemplateValue(value);

  return normalizedValue
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getProductionOrderFilename = (
  productionOrder: ProductionOrderForExport,
) => {
  const filenameParts = [
    'Lenh san xuat',
    sanitizeFilenamePart(productionOrder.item?.item_name),
    sanitizeFilenamePart(productionOrder.lot_no),
  ].filter(Boolean);

  if (filenameParts.length === 1) {
    filenameParts.push(String(productionOrder.id));
  }

  return `${filenameParts.join(' ')}.docx`;
};

const isFinishedProductProductionOrder = (
  productionOrder: ProductionOrderForExport,
) => productionOrder.item_code.startsWith('TP');

const getProductionOrderTemplatePath = (
  productionOrder: ProductionOrderForExport,
) =>
  isFinishedProductProductionOrder(productionOrder)
    ? FINISHED_PRODUCT_PRODUCTION_ORDER_TEMPLATE_PATH
    : SEMI_FINISHED_PRODUCT_PRODUCTION_ORDER_TEMPLATE_PATH;

const getTemplateData = (productionOrder: ProductionOrderForExport) => ({
  item_code: normalizeTemplateValue(productionOrder.item_code),
  item_name: normalizeTemplateValue(productionOrder.item?.item_name),
  production_order_code: normalizeTemplateValue(
    productionOrder.production_order_code,
  ),
  lot_no: normalizeTemplateValue(productionOrder.lot_no),
  batch_size: getBatchSize(productionOrder),
  date_manufacture: formatShortDate(productionOrder.date_manufacture),
  expire_date: formatShortDate(productionOrder.expire_date),
  packing_specification: normalizeTemplateValue(
    productionOrder.packing_specification,
  ),
  remarks: normalizeTemplateValue(productionOrder.remarks),
});

@Injectable()
export class ProductionOrderExportService {
  async export(productionOrder: ProductionOrderForExport) {
    const template = await fs.readFile(
      getProductionOrderTemplatePath(productionOrder),
    );
    const zip = new PizZip(template);
    const doc = new Docxtemplater(zip, {
      delimiters: {
        start: '{{',
        end: '}}',
      },
      linebreaks: true,
      paragraphLoop: true,
    });

    doc.render(getTemplateData(productionOrder));

    return {
      buffer: doc.getZip().generate({
        compression: 'DEFLATE',
        type: 'nodebuffer',
      }) as Buffer,
      contentType: DOCX_MIME_TYPE,
      filename: getProductionOrderFilename(productionOrder),
    };
  }
}
