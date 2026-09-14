import {
  buildSemiFinishedNetWeightChecksHtml,
  type SemiFinishedNetWeightCheckForReport,
} from './semi-finished-net-weight-checks-report-html';
import {
  buildSemiFinishedGrossWeightChecksHtml,
  type SemiFinishedGrossWeightCheckForReport,
} from './semi-finished-gross-weight-checks-report-html';
import { buildVolumeChecksHtml, type VolumeCheckForReport } from './volume-checks-report-html';
import { buildHygieneChecksHtml, type HygieneCheckForReport } from './hygiene-checks-report-html';
import {
  buildLeakTightnessChecksHtml,
  type LeakTightnessCheckForReport,
} from './leak-tightness-checks-report-html';
import {
  buildEnvironmentChecksHtml,
  type EnvironmentCheckForReport,
} from './environment-checks-report-html';
import {
  buildSemiFinishedProductSummariesHtml,
  type SemiFinishedProductSummaryForReport,
} from './semi-finished-product-summaries-report-html';
import {
  buildShellWeightChecksHtml,
  type ShellWeightCheckForReport,
} from './shell-weight-checks-report-html';
import {
  buildDisinfectantPreparationsHtml,
  type DisinfectantPreparationForReport,
} from './disinfectant-preparations-report-html';
import {
  buildPostHomogenizationGranuleChecksHtml,
  type PostHomogenizationGranuleCheckForReport,
} from './post-homogenization-granule-checks-report-html';
import {
  buildSensoryChecksHtml,
  type SensoryCheckForReport,
} from './sensory-checks-report-html';
import { Injectable } from '@nestjs/common';
import type {
  Items,
  ProductionOrders,
  RegistrationNumbers,
  ProductionOrderDeviations,
  Users,
} from '@prisma/client';
import Docxtemplater from 'docxtemplater';
import fs from 'node:fs/promises';
import path from 'node:path';
import PizZip from 'pizzip';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import { renderProductionOrderReportHtml } from './production-order-report-html';
import type { ProductionOrderLineWithRelations } from '../production-orders.service';

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
  environmentChecks?: EnvironmentCheckForReport[];
  hygieneChecks?: HygieneCheckForReport[];
  volumeChecks?: VolumeCheckForReport[];
  semiFinishedProductNetWeightChecks?: SemiFinishedNetWeightCheckForReport[];
  semiFinishedProductGrossWeightChecks?: SemiFinishedGrossWeightCheckForReport[];
  leakTightnessChecks?: LeakTightnessCheckForReport[];
  semiFinishedProductSummaries?: SemiFinishedProductSummaryForReport[];
  shellWeightChecks?: ShellWeightCheckForReport[];
  disinfectantPreparations?: DisinfectantPreparationForReport[];
  postHomogenizationGranuleChecks?: PostHomogenizationGranuleCheckForReport[];
  tenUnitSensoryChecks?: SensoryCheckForReport[];
  item?:
    | (Items & {
        registration?: RegistrationNumbers | null;
      })
    | null;
  deviations?: (ProductionOrderDeviations & {
    reporter?: Users | null;
    approver?: Users | null;
  })[];
  documentControl?: any;
  pyclm?: any;
};

const formatDisplayDate = (value: unknown) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const formatDisplayDateTime = (value: unknown) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

const formatProductionOrderStatus = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const statusLabels: Record<string, string> = {
    boposPlanned: 'Đã lên kế hoạch',
    boppPlanned: 'Đã lên kế hoạch',
    Planned: 'Đã lên kế hoạch',
    P: 'Đã lên kế hoạch',
    boposReleased: 'Đã phát hành',
    boppReleased: 'Đã phát hành',
    Released: 'Đã phát hành',
    R: 'Đã phát hành',
    boposClosed: 'Đã đóng',
    boppClosed: 'Đã đóng',
    Closed: 'Đã đóng',
    L: 'Đã đóng',
    boposCancelled: 'Đã hủy',
    boppCancelled: 'Đã hủy',
    Cancelled: 'Đã hủy',
    C: 'Đã hủy',
  };

  const key = String(value);
  return statusLabels[key] ?? key;
};

const formatProductionOrderType = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const typeLabels: Record<string, string> = {
    bopotStandard: 'Tiêu chuẩn',
    Standard: 'Tiêu chuẩn',
    S: 'Tiêu chuẩn',
    bopotSpecial: 'Đặc biệt',
    Special: 'Đặc biệt',
    P: 'Đặc biệt',
    bopotDisassembly: 'Tháo rã',
    Disassembly: 'Tháo rã',
    D: 'Tháo rã',
  };

  const key = String(value);
  return typeLabels[key] ?? key;
};

const getDocControlUserLabel = (user?: any) =>
  user?.name ?? user?.full_name ?? user?.username ?? user?.email ?? '';

const getDocControlStatusText = (
  completedAt?: Date | string | null,
  completedBy?: any,
) => {
  if (!completedAt) {
    return 'Chưa thực hiện';
  }

  const userLabel = getDocControlUserLabel(completedBy);
  return [formatDisplayDateTime(completedAt), userLabel && `- ${userLabel}`]
    .filter(Boolean)
    .join(' ');
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

const getRegistrationNumber = (productionOrder: ProductionOrderForExport) => {
  const itemReg = productionOrder.item?.registration?.registration_number?.trim();
  const itemDk = (productionOrder.item as any)?.dk_code?.trim();
  const poReg =
    (productionOrder as any).registrationNumber?.registration_number?.trim() ||
    (productionOrder as any).registrationNumber?.registration?.registration_number?.trim();

  const reg = itemReg || poReg;
  if (reg && itemDk && reg !== itemDk && !reg.includes(itemDk) && !itemDk.includes(reg)) {
    return `${reg} (${itemDk})`;
  }
  return reg || itemDk || '';
};

const getProductLine = (productionOrder: ProductionOrderForExport) => {
  const spec =
    (productionOrder.item as any)?.productionSpecification ||
    (productionOrder as any)?.productionSpecification;
  const pl = spec?.productLine;
  if (pl) {
    return [pl.code, pl.name].filter(Boolean).join(' - ');
  }
  return spec?.product_line || '';
};

const getDosageForm = (productionOrder: ProductionOrderForExport) => {
  const spec =
    (productionOrder.item as any)?.productionSpecification ||
    (productionOrder as any)?.productionSpecification;
  return spec?.dosageForm?.name || spec?.dosage_form || '';
};

const formatLimitWithOp = (
  val: unknown,
  unit?: string | null,
  op?: string | null,
) => {
  if (val === null || val === undefined || val === '') return '';
  const numStr = Number(val);
  const formattedVal = Number.isNaN(numStr)
    ? String(val)
    : numStr.toLocaleString('vi-VN');
  return [op, formattedVal, unit].filter(Boolean).join(' ');
};

const formatLimitRange = (
  lowerVal: unknown,
  lowerOp: string | null | undefined,
  upperVal: unknown,
  upperOp: string | null | undefined,
  unit?: string | null,
) => {
  const lowerStr = formatLimitWithOp(lowerVal, unit, lowerOp);
  const upperStr = formatLimitWithOp(upperVal, unit, upperOp);
  if (lowerStr && upperStr) {
    if (lowerStr === upperStr) return lowerStr;
    return `${lowerStr} – ${upperStr}`;
  }
  return lowerStr || upperStr || '—';
};

const buildSpecificationsTableHtml = (
  productionOrder: ProductionOrderForExport,
) => {
  const spec =
    (productionOrder.item as any)?.productionSpecification ||
    (productionOrder as any)?.productionSpecification;

  if (!spec) {
    return '';
  }

  const rows: { name: string; control: string; allowed: string }[] = [];

  // 1. Thể tích / Khối lượng đóng gói (Giới hạn chung)
  const generalControl = formatLimitRange(
    spec.lower_control_limit,
    spec.lower_control_limit_operator,
    spec.upper_control_limit,
    spec.upper_control_limit_operator,
    spec.unit,
  );
  const generalAllowed = formatLimitRange(
    spec.lower_allowed_limit,
    spec.lower_allowed_limit_operator,
    spec.upper_allowed_limit,
    spec.upper_allowed_limit_operator,
    spec.unit,
  );
  if (generalControl !== '—' || generalAllowed !== '—') {
    rows.push({
      name: 'Giới hạn đóng gói (Thể tích / Khối lượng)',
      control: generalControl,
      allowed: generalAllowed,
    });
  }

  // 2. Số liều xịt
  const sprayControl = formatLimitRange(
    spec.spray_dose_lower_control_limit,
    '>=',
    spec.spray_dose_upper_control_limit,
    '<=',
    'liều',
  );
  const sprayAllowed = formatLimitRange(
    spec.spray_dose_lower_allowed_limit,
    '>=',
    spec.spray_dose_upper_allowed_limit,
    '<=',
    'liều',
  );
  if (sprayControl !== '—' || sprayAllowed !== '—') {
    rows.push({
      name: 'Số liều xịt',
      control: sprayControl,
      allowed: sprayAllowed,
    });
  }

  // 3. Khối lượng viên nén bao phim
  const tabletWeightUnit = spec.film_coated_tablet_weight_unit || 'mg';
  const tabletWeightControl = formatLimitRange(
    spec.film_coated_tablet_weight_lower_control_limit,
    null,
    spec.film_coated_tablet_weight_upper_control_limit,
    null,
    tabletWeightUnit,
  );
  const tabletWeightAllowed = formatLimitRange(
    spec.film_coated_tablet_weight_lower_allowed_limit,
    null,
    spec.film_coated_tablet_weight_upper_allowed_limit,
    null,
    tabletWeightUnit,
  );
  if (tabletWeightControl !== '—' || tabletWeightAllowed !== '—') {
    rows.push({
      name: 'Khối lượng viên nén bao phim',
      control: tabletWeightControl,
      allowed: tabletWeightAllowed,
    });
  }

  // 4. Độ cứng viên
  const hardnessUnit = spec.hardness_unit || 'N';
  const hardnessControl = formatLimitRange(
    spec.hardness_lower_control_limit,
    null,
    spec.hardness_upper_control_limit,
    null,
    hardnessUnit,
  );
  const hardnessAllowed = formatLimitRange(
    spec.hardness_lower_allowed_limit,
    null,
    spec.hardness_upper_allowed_limit,
    null,
    hardnessUnit,
  );
  if (hardnessControl !== '—' || hardnessAllowed !== '—') {
    rows.push({
      name: 'Độ cứng viên',
      control: hardnessControl,
      allowed: hardnessAllowed,
    });
  }

  // 5. Độ dày viên
  const thicknessUnit = spec.tablet_thickness_unit || 'mm';
  const thicknessControl = formatLimitWithOp(
    spec.tablet_thickness_control_limit,
    thicknessUnit,
  );
  const thicknessAllowed = formatLimitWithOp(
    spec.tablet_thickness_allowed_limit,
    thicknessUnit,
  );
  if (thicknessControl || thicknessAllowed) {
    rows.push({
      name: 'Độ dày viên',
      control: thicknessControl || '—',
      allowed: thicknessAllowed || '—',
    });
  }

  // 6. Thời gian rã
  const disintegrationUnit = spec.disintegration_time_unit || 'phút';
  const disintegrationControl = formatLimitWithOp(
    spec.disintegration_time_control_limit,
    disintegrationUnit,
  );
  const disintegrationAllowed = formatLimitWithOp(
    spec.disintegration_time_allowed_limit,
    disintegrationUnit,
  );
  if (disintegrationControl || disintegrationAllowed) {
    rows.push({
      name: 'Thời gian rã',
      control: disintegrationControl || '—',
      allowed: disintegrationAllowed || '—',
    });
  }

  if (rows.length === 0) {
    return '';
  }

  const trs = rows
    .map(
      (r) => `
        <tr>
          <td class="spec-label">${r.name}</td>
          <td class="spec-value">${r.control}</td>
          <td class="spec-value">${r.allowed}</td>
        </tr>`,
    )
    .join('');

  return `
    <div style="margin-top: 4mm;">
      <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 2mm; text-transform: uppercase; color: #000;">
        Tiêu chuẩn kỹ thuật kiểm soát chất lượng (IPC)
      </h3>
      <table class="batch-spec-table">
        <thead>
          <tr>
            <th style="width: 40%; text-align: left;">Chỉ tiêu kiểm tra</th>
            <th style="width: 30%; text-align: left;">Giới hạn kiểm soát</th>
            <th style="width: 30%; text-align: left;">Giới hạn cho phép</th>
          </tr>
        </thead>
        <tbody>
          ${trs}
        </tbody>
      </table>
    </div>`;
};

const getTemplateData = (productionOrder: ProductionOrderForExport) => ({
  item_code: normalizeTemplateValue(productionOrder.item_code),
  item_name: normalizeTemplateValue(productionOrder.item?.item_name),
  product_line: normalizeTemplateValue(getProductLine(productionOrder)),
  dosage_form: normalizeTemplateValue(getDosageForm(productionOrder)),
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
  registration_number: normalizeTemplateValue(
    getRegistrationNumber(productionOrder),
  ),
  remarks: normalizeTemplateValue(productionOrder.remarks),
  status: normalizeTemplateValue(productionOrder.status),
  order_type: normalizeTemplateValue(productionOrder.type),
  planned_quantity: `${Number(productionOrder.planned_quatity || 0).toLocaleString('vi-VN')} ${normalizeTemplateValue(productionOrder.unit)}`,
  warehouse: normalizeTemplateValue(productionOrder.warehouse),
  creation_date: formatShortDate(productionOrder.creation_date?.toISOString?.() ?? ''),
  start_date: formatShortDate(productionOrder.start_date?.toISOString?.() ?? ''),
  change_content: normalizeTemplateValue(productionOrder.change_content),
});

@Injectable()
export class ProductionOrderExportService {
  constructor(
    private readonly pdfRenderer: ProductionOrderPdfRendererService,
  ) {}

  async exportBatchReport(
    productionOrder: ProductionOrderForExport,
    user?: any,
    lines?: ProductionOrderLineWithRelations[],
  ) {
    const printTime = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());
    const printerName = user?.name || user?.full_name || user?.username || '';
    const appInfo = `${process.env.APP_NAME || 'EBR System'} - ${process.env.APP_VERSION || 'v1.0.0'}`;

    // Read watermark for inline embedding in multi-page sections
    const directory = path.join(process.cwd(), 'templates', 'batch-report');
    const [watermarkBuf] = await Promise.all([
      fs.readFile(path.join(directory, 'logo-removebg.png')),
    ]);
    const watermarkDataUri = `data:image/png;base64,${watermarkBuf.toString('base64')}`;
    const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
    const safeAppInfo = esc(appInfo);
    const safePrintTime = esc(printTime);
    const safePrinterName = esc(printerName);


    const formatNum = (v: unknown) => {
      if (v === null || v === undefined || v === '') return '';
      const n = Number(v);
      if (Number.isNaN(n)) return String(v);
      return n.toLocaleString('vi-VN');
    };
    const formatDate = (v: unknown) => {
      if (!v) return '';
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString('vi-VN');
    };

    const tableHead = `
      <thead>
        <tr>
          <th style="width: 10%;">Giai đoạn</th>
          <th style="width: 11%;">Mã hàng</th>
          <th style="width: 27%;">Tên hàng</th>
          <th style="width: 14%;">Số lô</th>
          <th style="width: 9%;">Hạn dùng</th>
          <th style="width: 8%;">Kho</th>
          <th style="width: 7%; text-align: right;">Yêu cầu</th>
          <th style="width: 7%; text-align: right;">Đã xuất</th>
          <th style="width: 7%;">ĐVT</th>
        </tr>
      </thead>`;

    // The PDF renderer measures this table after fonts are loaded and moves a
    // row to the next page only when it reaches the footer.  Do not split by a
    // fixed row count here: item names, batch numbers and stages can wrap to a
    // different number of lines, leaving a mostly empty final page.
    const buildPageSection = (rowsHtml: string) => `
  <main class="report-page page-break warehouse-release-page">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">
        Thông tin phiếu xuất kho
      </h2>
      <table class="deviations-table">${tableHead}<tbody>${rowsHtml}</tbody></table>
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;

    let linesHtml = '';

    if (lines && lines.length > 0) {
      const allRows = lines.map((line) => {
        const stage = (line.ProductionOrdersStage as any)?.Name ?? (line.ProductionOrdersStage as any)?.SequenceNumber ?? '';
        const unit = (line.UnitOfMeasurement as any)?.Name ?? (line.UnitOfMeasurement as any)?.Code ?? '';
        return `<tr>
          <td>${stage}</td>
          <td style="font-weight: bold;">${(line as any).ItemNo ?? ''}</td>
          <td style="white-space: normal; word-wrap: break-word;">${(line as any).ItemName ?? ''}</td>
          <td style="white-space: normal; word-wrap: break-word;">${(line as any).U_SL ?? ''}</td>
          <td>${formatDate((line as any).U_HSD)}</td>
          <td>${(line as any).Warehouse ?? ''}</td>
          <td style="text-align: right;">${formatNum((line as any).PlannedQuantity)}</td>
          <td style="text-align: right;">${formatNum((line as any).IssuedQuantity)}</td>
          <td>${unit}</td>
        </tr>`;
      });

      linesHtml = buildPageSection(allRows.join(''));
    } else {
      linesHtml = `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 6mm; text-transform: uppercase; color: #000;">
        Thông tin phiếu xuất kho
      </h2>
      <div style="margin-top: 15mm;">
        <p style="text-align: center; font-style: italic;">(Chưa có dữ liệu)</p>
      </div>
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    }

    const buildDeviationsHtml = () => {
      const deviations = (productionOrder as any).deviations ?? [];

      if (!deviations || deviations.length === 0) {
        return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">
        Thông tin sai lệch
      </h2>
      <div style="margin-top: 15mm; text-align: center;">
        <p style="font-size: 11pt; font-style: italic; color: #475569;">
          (Không có sai lệch nào phát sinh trong quá trình sản xuất lô này)
        </p>
      </div>
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
      }

      const rows = deviations
        .map((dev: any, index: number) => {
          const time = formatDisplayDateTime(dev.created_at);
          const reporterName = esc(dev.reporter?.name ?? dev.reporter?.username ?? '');
          const approverName = esc(dev.approver?.name ?? dev.approver?.username ?? '');

          let quantityHtml = '';
          if (dev.affected_quantity !== null && dev.affected_quantity !== undefined && dev.affected_quantity !== '') {
            quantityHtml += `<div><span style="color: #64748b;">Ảnh hưởng:</span> <b>${formatNum(dev.affected_quantity)}</b> ${esc(dev.affected_quantity_unit ?? '')}</div>`;
          }
          if (dev.handled_quantity !== null && dev.handled_quantity !== undefined && dev.handled_quantity !== '') {
            quantityHtml += `<div><span style="color: #64748b;">Đã xử lý:</span> <b>${formatNum(dev.handled_quantity)}</b> ${esc(dev.handled_quantity_unit ?? '')}</div>`;
          }
          if (dev.destroyed_quantity !== null && dev.destroyed_quantity !== undefined && dev.destroyed_quantity !== '') {
            quantityHtml += `<div><span style="color: #dc2626;">Đã hủy:</span> <b>${formatNum(dev.destroyed_quantity)}</b> ${esc(dev.destroyed_quantity_unit ?? '')}</div>`;
          }

          const causeClassification = dev.cause_classification
            ? `<div style="font-size: 8pt; color: #64748b; font-style: italic; margin-bottom: 1mm;">[${esc(dev.cause_classification)}]</div>`
            : '';
          const causeContent = dev.cause ? esc(dev.cause) : (dev.cause_classification ? '' : '—');

          const handlingPlan = dev.handling_plan
            ? `<div><span style="font-weight: bold;">PA:</span> ${esc(dev.handling_plan)}</div>`
            : '';
          const handlingResult = dev.handling_result
            ? `<div style="margin-top: 1mm;"><span style="font-weight: bold;">KQ:</span> ${esc(dev.handling_result)}</div>`
            : '';
          const handlingCombined = handlingPlan || handlingResult ? `${handlingPlan}${handlingResult}` : '—';

          const personnelHtml =
            `<div><span style="color: #64748b;">Báo cáo:</span> ${reporterName || '—'}</div>` +
            (approverName
              ? `<div style="margin-top: 1mm;"><span style="color: #166534;">Duyệt:</span> ${approverName}</div>`
              : `<div style="margin-top: 1mm; color: #94a3b8; font-style: italic;">Chưa duyệt</div>`);

          return `<tr>
          <td style="text-align: center; vertical-align: middle;">${index + 1}</td>
          <td style="text-align: center; vertical-align: middle; font-size: 8.5pt;">${time}</td>
          <td style="vertical-align: top; white-space: normal; word-wrap: break-word;">
            <div style="font-weight: bold; margin-bottom: 1mm;">${esc(dev.deviation_content ?? '')}</div>
            ${quantityHtml ? `<div style="font-size: 8pt; margin-top: 1.5mm; border-top: 0.5pt dashed #cbd5e1; padding-top: 1mm;">${quantityHtml}</div>` : ''}
          </td>
          <td style="vertical-align: top; white-space: normal; word-wrap: break-word;">
            ${causeClassification}
            <div>${causeContent}</div>
          </td>
          <td style="vertical-align: top; white-space: normal; word-wrap: break-word;">
            ${handlingCombined}
          </td>
          <td style="vertical-align: top; font-size: 8.5pt;">
            ${personnelHtml}
          </td>
        </tr>`;
        })
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">
        Thông tin sai lệch
      </h2>
      <table class="deviations-table">
        <thead>
          <tr>
            <th style="width: 5%;">STT</th>
            <th style="width: 12%;">Thời gian</th>
            <th style="width: 28%;">Nội dung sai lệch</th>
            <th style="width: 18%;">Nguyên nhân</th>
            <th style="width: 23%;">Phương án & Kết quả xử lý</th>
            <th style="width: 14%;">Nhân sự</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const isPyclmSent = Boolean((productionOrder as any).pyclm?.isSent);
    const pyclmStatusHtml = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${
      isPyclmSent ? '#22c55e' : '#ef4444'
    }; margin-right: 6px; vertical-align: middle;"></span><span>${
      isPyclmSent ? 'Đã gửi' : 'Chưa gửi'
    }</span>`;

    const docControl = (productionOrder as any).documentControl;

    const html = await renderProductionOrderReportHtml(
      {
        ...getTemplateData(productionOrder),
        print_time: printTime,
        printer_name: printerName,
        app_info: appInfo,
        status_label: formatProductionOrderStatus(productionOrder.status),
        type_label: formatProductionOrderType(productionOrder.type),
        planned_quantity_display: `${Number(productionOrder.planned_quatity || 0).toLocaleString('vi-VN')} ${normalizeTemplateValue(productionOrder.unit)}`.trim(),
        display_creation_date: formatDisplayDate(productionOrder.creation_date),
        display_start_date: formatDisplayDate(productionOrder.start_date),
        display_date_manufacture: formatDisplayDate(productionOrder.date_manufacture),
        display_expire_date: formatDisplayDate(productionOrder.expire_date),
        pyclm_status_html: pyclmStatusHtml,
        doc_batch_record_issued: getDocControlStatusText(
          docControl?.batch_record_issued_at,
          docControl?.batchRecordIssuedBy,
        ),
        doc_batch_record_received: getDocControlStatusText(
          docControl?.batch_record_received_at,
          docControl?.batchRecordReceivedBy,
        ),
        doc_warehouse_release_received: getDocControlStatusText(
          docControl?.warehouse_release_received_at,
          docControl?.warehouseReleaseReceivedBy,
        ),
        doc_test_certificate_received: getDocControlStatusText(
          docControl?.test_certificate_received_at,
          docControl?.testCertificateReceivedBy,
        ),
        specifications_table_html: buildSpecificationsTableHtml(productionOrder),
        warehouse_release_html: linesHtml,
        deviations_html: buildDeviationsHtml(),
        volume_checks_html: buildVolumeChecksHtml(
          productionOrder.volumeChecks ?? [],
          { appInfo, printTime, printerName, watermarkDataUri },
        ),
        semi_finished_net_weight_checks_html:
          buildSemiFinishedNetWeightChecksHtml(
            productionOrder.semiFinishedProductNetWeightChecks ?? [],
            { appInfo, printTime, printerName, watermarkDataUri },
          ),
        semi_finished_gross_weight_checks_html:
          buildSemiFinishedGrossWeightChecksHtml(
            productionOrder.semiFinishedProductGrossWeightChecks ?? [],
            { appInfo, printTime, printerName, watermarkDataUri },
          ),
        leak_tightness_checks_html: buildLeakTightnessChecksHtml(
          productionOrder.leakTightnessChecks ?? [],
          { appInfo, printTime, printerName, watermarkDataUri },
        ),
        semi_finished_product_summaries_html:
          buildSemiFinishedProductSummariesHtml(
            productionOrder.semiFinishedProductSummaries ?? [],
            { appInfo, printTime, printerName, watermarkDataUri },
          ),
        shell_weight_checks_html: buildShellWeightChecksHtml(
          productionOrder.shellWeightChecks ?? [],
          { appInfo, printTime, printerName, watermarkDataUri },
        ),
        disinfectant_preparations_html: buildDisinfectantPreparationsHtml(
          productionOrder.disinfectantPreparations ?? [],
          { appInfo, printTime, printerName, watermarkDataUri },
        ),
        post_homogenization_granule_checks_html:
          buildPostHomogenizationGranuleChecksHtml(
            productionOrder.postHomogenizationGranuleChecks ?? [],
            { appInfo, printTime, printerName, watermarkDataUri },
          ),
        sensory_checks_html: buildSensoryChecksHtml(
          productionOrder.tenUnitSensoryChecks ?? [],
          { appInfo, printTime, printerName, watermarkDataUri },
        ),
        hygiene_checks_html: buildHygieneChecksHtml(
          productionOrder.hygieneChecks ?? [],
          { appInfo, printTime, printerName, watermarkDataUri },
        ),
        environment_checks_html: buildEnvironmentChecksHtml(
          productionOrder.environmentChecks ?? [],
          { appInfo, printTime, printerName, watermarkDataUri },
        ),
      },
      [
        'warehouse_release_html',
        'deviations_html',
        'environment_checks_html',
        'hygiene_checks_html',
        'volume_checks_html',
        'semi_finished_net_weight_checks_html',
        'semi_finished_gross_weight_checks_html',
        'leak_tightness_checks_html',
        'semi_finished_product_summaries_html',
        'shell_weight_checks_html',
        'disinfectant_preparations_html',
        'post_homogenization_granule_checks_html',
        'sensory_checks_html',
        'pyclm_status_html',
        'specifications_table_html',
      ],
    );
    return {
      buffer: await this.pdfRenderer.render(html),
      contentType: 'application/pdf',
      filename: getProductionOrderFilename(productionOrder)
        .replace(/^Lenh san xuat/, 'Bao cao lo san xuat')
        .replace(/\.docx$/, '.pdf'),
    };
  }

  async export(productionOrder: ProductionOrderForExport) {
    return this.renderTemplate(
      productionOrder,
      getProductionOrderTemplatePath(productionOrder),
    );
  }

  private async renderTemplate(
    productionOrder: ProductionOrderForExport,
    templatePath: string,
  ) {
    const template = await fs.readFile(templatePath);
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
