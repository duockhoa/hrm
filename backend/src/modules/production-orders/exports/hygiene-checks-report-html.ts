import type { ProductionOrderHygieneChecks } from '@prisma/client';

export type HygieneCheckForReport = Pick<
  ProductionOrderHygieneChecks,
  'room_or_equipment' | 'cleaning_type' | 'result' | 'note' | 'created_at'
> & { createdBy?: { name?: string | null; username?: string | null } | null };

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export function buildHygieneChecksHtml(
  checks: HygieneCheckForReport[],
  metadata: {
    appInfo: string;
    headerTitle?: string;
    printTime: string;
    printerName: string;
    watermarkDataUri: string;
  },
) {
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
    <td>${escapeHtml(check.room_or_equipment)}</td>
    <td>${escapeHtml(check.cleaning_type)}</td>
    <td>${escapeHtml(check.result)}</td>
    <td>${escapeHtml(check.note || '—')}</td>
    <td>${escapeHtml(check.createdBy?.name || check.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break hygiene-check-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.headerTitle || '—')}</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Kiểm tra vệ sinh</h2>
      ${
        checks.length
          ? `<table class="deviations-table" aria-label="Kiểm tra vệ sinh">
        <thead><tr>
          <th style="width: 5%;">STT</th>
          <th style="width: 17%;">Thời điểm ghi nhận</th>
          <th style="width: 19%;">Phòng/thiết bị</th>
          <th style="width: 12%;">Loại vệ sinh</th>
          <th style="width: 10%;">Kết quả</th>
          <th style="width: 21%;">Ghi chú</th>
          <th style="width: 16%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu kiểm tra vệ sinh.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
