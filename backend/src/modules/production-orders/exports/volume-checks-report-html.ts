import type { ProductionOrderVolumeChecks } from '@prisma/client';

export type VolumeCheckForReport = Pick<
  ProductionOrderVolumeChecks,
  | 'package_type'
  | 'dosage_form_stage'
  | 'requirement'
  | 'lower_limit'
  | 'upper_limit'
  | 'unit'
  | 'unit_1_volume'
  | 'unit_2_volume'
  | 'unit_3_volume'
  | 'unit_4_volume'
  | 'unit_5_volume'
  | 'unit_6_volume'
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

export function buildVolumeChecksHtml(
  checks: VolumeCheckForReport[],
  metadata: {
    appInfo: string;
    headerTitle?: string;
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
          maximumFractionDigits: 2,
        });
  const stageLabels: Record<string, string> = {
    tablet: 'Viên nén',
    capsule: 'Viên nang',
    film_coated_tablet: 'Viên nén bao phim',
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
    <td>${escapeHtml([check.package_type, stageLabels[check.dosage_form_stage ?? ''] ?? check.dosage_form_stage].filter(Boolean).join(' / ') || '—')}</td>
    <td>${escapeHtml(check.requirement || '—')}</td>
    <td>${check.lower_limit == null && check.upper_limit == null ? 'Chưa có' : `${formatNumber(check.lower_limit)} – ${formatNumber(check.upper_limit)} ${escapeHtml(check.unit || 'ml')}`}</td>
    <td>${[check.unit_1_volume, check.unit_2_volume, check.unit_3_volume, check.unit_4_volume, check.unit_5_volume, check.unit_6_volume].map((value, index) => `${index + 1}: ${formatNumber(value)}${value == null ? '' : ` ${escapeHtml(check.unit || 'ml')}`}`).join('<br>')}</td>
    <td>${escapeHtml(check.createdBy?.name || check.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break volume-check-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.headerTitle || '—')}</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Kiểm tra thể tích</h2>
      ${
        checks.length
          ? `<table class="deviations-table" aria-label="Kiểm tra thể tích">
        <thead><tr>
          <th style="width: 5%;">STT</th>
          <th style="width: 15%;">Thời điểm kiểm tra</th>
          <th style="width: 12%;">Dạng kiểm tra</th>
          <th style="width: 22%;">Yêu cầu</th>
          <th style="width: 13%;">Khoảng kiểm soát</th>
          <th style="width: 17%;">Thể tích đơn vị 1–6</th>
          <th style="width: 16%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu kiểm tra thể tích.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
