import type { ProductionOrderShellWeightChecks } from '@prisma/client';

export type ShellWeightCheckForReport = Pick<
  ProductionOrderShellWeightChecks,
  | 'shell_1_weight'
  | 'shell_2_weight'
  | 'shell_3_weight'
  | 'shell_4_weight'
  | 'shell_5_weight'
  | 'shell_6_weight'
  | 'shell_7_weight'
  | 'shell_8_weight'
  | 'shell_9_weight'
  | 'shell_10_weight'
  | 'unit'
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

export function buildShellWeightChecksHtml(
  checks: ShellWeightCheckForReport[],
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
          maximumFractionDigits: 2,
        });
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
    <td>${[
      check.shell_1_weight,
      check.shell_2_weight,
      check.shell_3_weight,
      check.shell_4_weight,
      check.shell_5_weight,
      check.shell_6_weight,
      check.shell_7_weight,
      check.shell_8_weight,
      check.shell_9_weight,
      check.shell_10_weight,
    ]
      .map(
        (value, shellIndex) =>
          `${shellIndex + 1}: ${formatNumber(value)}${value == null ? '' : ` ${escapeHtml(check.unit || 'mg')}`}`,
      )
      .join('<br>')}</td>
    <td>${escapeHtml(check.createdBy?.name || check.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break shell-weight-check-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Kiểm tra khối lượng vỏ</h2>
      ${
        checks.length
          ? `<table class="deviations-table" aria-label="Kiểm tra khối lượng vỏ">
        <thead><tr>
          <th style="width: 8%;">STT</th>
          <th style="width: 22%;">Thời điểm kiểm tra</th>
          <th style="width: 48%;">Khối lượng vỏ 1–10</th>
          <th style="width: 22%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu kiểm tra khối lượng vỏ.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
