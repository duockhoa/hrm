import type { ProductionOrderSemiFinishedProductSummaries } from '@prisma/client';

export type SemiFinishedProductSummaryForReport = Pick<
  ProductionOrderSemiFinishedProductSummaries,
  | 'stage'
  | 'input_quantity'
  | 'input_unit'
  | 'load_quantity'
  | 'load_unit'
  | 'packed_quantity'
  | 'packed_unit'
  | 'leftover_quantity'
  | 'leftover_unit'
  | 'waste_quantity'
  | 'waste_unit'
  | 'created_at'
> & { createdBy?: { name?: string | null; username?: string | null } | null };

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export function buildSemiFinishedProductSummariesHtml(
  summaries: SemiFinishedProductSummaryForReport[],
  metadata: {
    appInfo: string;
    headerTitle?: string;
    printTime: string;
    printerName: string;
    watermarkDataUri: string;
  },
) {
  const formatQuantity = (
    quantity: unknown,
    unit: string | null | undefined,
    defaultUnit = '',
  ) => {
    if (quantity == null) return '—';
    const num = Number(quantity);
    if (Number.isNaN(num)) return '—';
    const formatted = num.toLocaleString('vi-VN', {
      maximumFractionDigits: 3,
    });
    const effectiveUnit = unit || defaultUnit;
    return effectiveUnit
      ? `${formatted} ${escapeHtml(effectiveUnit)}`
      : formatted;
  };

  const rows = summaries
    .map(
      (summary, index) => `<tr>
    <td style="text-align: center;">${index + 1}</td>
    <td style="text-align: center;">${escapeHtml(
      new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(summary.created_at),
    )}</td>
    <td>${escapeHtml(summary.stage || '—')}</td>
    <td style="text-align: right;">${formatQuantity(summary.input_quantity, summary.input_unit, 'kg')}</td>
    <td style="text-align: right;">${formatQuantity(summary.packed_quantity, summary.packed_unit, 'kg')}</td>
    <td style="text-align: right;">${formatQuantity(summary.leftover_quantity, summary.leftover_unit, 'kg')}</td>
    <td style="text-align: right;">${formatQuantity(summary.waste_quantity, summary.waste_unit, 'kg')}</td>
    <td style="text-align: right;">${formatQuantity(summary.load_quantity, summary.load_unit, 'tải')}</td>
    <td>${escapeHtml(summary.createdBy?.name || summary.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break semi-finished-product-summary-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.headerTitle || '—')}</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Tổng kết sản lượng bán thành phẩm</h2>
      ${
        summaries.length
          ? `<table class="deviations-table" aria-label="Tổng kết sản lượng bán thành phẩm">
        <thead><tr>
          <th style="width: 5%;">STT</th>
          <th style="width: 15%;">Thời điểm</th>
          <th style="width: 14%;">Giai đoạn</th>
          <th style="width: 11%;">Đầu vào</th>
          <th style="width: 11%;">Đã đóng</th>
          <th style="width: 11%;">Còn lại</th>
          <th style="width: 11%;">Hao hụt</th>
          <th style="width: 10%;">Số tải / sọt lọ</th>
          <th style="width: 12%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu tổng kết sản lượng bán thành phẩm.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
