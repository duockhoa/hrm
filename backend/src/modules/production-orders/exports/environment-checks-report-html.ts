import type { ProductionOrderEnvironmentChecks } from '@prisma/client';

export type EnvironmentCheckForReport = Pick<
  ProductionOrderEnvironmentChecks,
  'room' | 'temperature_c' | 'humidity_percent' | 'checked_at'
> & { createdBy?: { name?: string | null; username?: string | null } | null };

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export function buildEnvironmentChecksHtml(
  checks: EnvironmentCheckForReport[],
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
      : Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
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
      }).format(check.checked_at),
    )}</td>
    <td>${escapeHtml(check.room)}</td>
    <td style="text-align: right;">${formatNumber(check.temperature_c)}</td>
    <td style="text-align: right;">${formatNumber(check.humidity_percent)}</td>
    <td>${escapeHtml(check.createdBy?.name || check.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break environment-check-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.headerTitle || '—')}</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Theo dõi nhiệt độ, độ ẩm</h2>
      ${
        checks.length
          ? `<table class="deviations-table" aria-label="Theo dõi nhiệt độ, độ ẩm">
        <thead><tr>
          <th style="width: 6%;">STT</th>
          <th style="width: 21%;">Thời điểm kiểm tra</th>
          <th style="width: 24%;">Phòng</th>
          <th style="width: 13%;">Nhiệt độ (°C)</th>
          <th style="width: 13%;">Độ ẩm (%)</th>
          <th style="width: 23%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu nhiệt độ, độ ẩm.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
