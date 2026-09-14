import type { ProductionOrderSemiFinishedProductGrossWeightChecks } from '@prisma/client';

export type SemiFinishedGrossWeightCheckForReport = Pick<
  ProductionOrderSemiFinishedProductGrossWeightChecks,
  | 'dosage_form_stage'
  | 'requirement'
  | 'lower_limit'
  | 'upper_limit'
  | 'unit'
  | 'unit_1_gross_weight'
  | 'unit_2_gross_weight'
  | 'unit_3_gross_weight'
  | 'unit_4_gross_weight'
  | 'unit_5_gross_weight'
  | 'unit_6_gross_weight'
  | 'unit_7_gross_weight'
  | 'unit_8_gross_weight'
  | 'unit_9_gross_weight'
  | 'unit_10_gross_weight'
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

export function buildSemiFinishedGrossWeightChecksHtml(
  checks: SemiFinishedGrossWeightCheckForReport[],
  metadata: {
    appInfo: string;
    printTime: string;
    printerName: string;
    watermarkDataUri: string;
  },
) {
  const formatNumber = (value: unknown) =>
    value == null
      ? '—'
      : Number(value).toLocaleString('vi-VN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        });
  const stageLabels: Record<string, string> = {
    tablet: 'Viên nén',
    capsule: 'Viên nang',
    film_coated_tablet: 'Viên nén bao phim',
    granule_package: 'Gói cốm',
    solution_package: 'Gói dịch',
    oral_solution: 'Dung dịch uống',
  };
  const rows = checks
    .map(
      (check, index) => `<tr>
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
      }).format(check.created_at),
    )}</td>
    <td>${escapeHtml(stageLabels[check.dosage_form_stage ?? ''] ?? check.dosage_form_stage ?? '—')}</td>
    <td>${escapeHtml(check.requirement || '—')}</td>
    <td>${check.lower_limit == null && check.upper_limit == null ? 'Chưa có' : `${formatNumber(check.lower_limit)} – ${formatNumber(check.upper_limit)} ${escapeHtml(check.unit || 'g')}`}</td>
    <td>${[
      check.unit_1_gross_weight,
      check.unit_2_gross_weight,
      check.unit_3_gross_weight,
      check.unit_4_gross_weight,
      check.unit_5_gross_weight,
      check.unit_6_gross_weight,
      check.unit_7_gross_weight,
      check.unit_8_gross_weight,
      check.unit_9_gross_weight,
      check.unit_10_gross_weight,
    ]
      .map(
        (value, unitIndex) =>
          `${unitIndex + 1}: ${formatNumber(value)}${value == null ? '' : ` ${escapeHtml(check.unit || 'g')}`}`,
      )
      .join('<br>')}</td>
    <td>${escapeHtml(check.createdBy?.name || check.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break semi-finished-gross-weight-check-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Kiểm tra khối lượng cả bì</h2>
      ${
        checks.length
          ? `<table class="deviations-table" aria-label="Kiểm tra khối lượng cả bì">
        <thead><tr>
          <th style="width: 5%;">STT</th>
          <th style="width: 15%;">Thời điểm kiểm tra</th>
          <th style="width: 12%;">Dạng kiểm tra</th>
          <th style="width: 22%;">Yêu cầu</th>
          <th style="width: 13%;">Khoảng kiểm soát</th>
          <th style="width: 17%;">Khối lượng đơn vị 1–10</th>
          <th style="width: 16%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu kiểm tra khối lượng cả bì.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
