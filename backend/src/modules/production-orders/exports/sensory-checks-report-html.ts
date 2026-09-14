import type { ProductionOrderTenUnitSensoryChecks } from '@prisma/client';

export type SensoryCheckForReport = Pick<
  ProductionOrderTenUnitSensoryChecks,
  | 'dosage_form_stage'
  | 'unit_1_result'
  | 'unit_2_result'
  | 'unit_3_result'
  | 'unit_4_result'
  | 'unit_5_result'
  | 'unit_6_result'
  | 'unit_7_result'
  | 'unit_8_result'
  | 'unit_9_result'
  | 'unit_10_result'
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

const stageLabels: Record<string, string> = {
  tablet: 'Viên nén',
  capsule: 'Viên nang',
  film_coated_tablet: 'Viên nén bao phim',
  granule_package: 'Gói cốm',
  bottle: 'Lọ',
};

const formatResult = (value: boolean | null | undefined) =>
  value === true ? 'Đạt' : value === false ? 'Không đạt' : '—';

export function buildSensoryChecksHtml(
  checks: SensoryCheckForReport[],
  metadata: {
    appInfo: string;
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
    <td>${escapeHtml(stageLabels[check.dosage_form_stage ?? ''] ?? check.dosage_form_stage ?? '—')}</td>
    ${[
      check.unit_1_result,
      check.unit_2_result,
      check.unit_3_result,
      check.unit_4_result,
      check.unit_5_result,
      check.unit_6_result,
      check.unit_7_result,
      check.unit_8_result,
      check.unit_9_result,
      check.unit_10_result,
    ]
      .map((result) => `<td style="text-align: center;">${formatResult(result)}</td>`)
      .join('')}
    <td>${escapeHtml(check.createdBy?.name || check.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break sensory-check-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Kiểm tra cảm quan sản phẩm</h2>
      ${
        checks.length
          ? `<table class="deviations-table" aria-label="Kiểm tra cảm quan sản phẩm" style="font-size: 7pt;">
        <thead><tr>
          <th style="width: 4%;">STT</th>
          <th style="width: 13%;">Thời điểm</th>
          <th style="width: 10%;">Dạng bào chế</th>
          ${Array.from({ length: 10 }, (_, index) => `<th style="width: 4.5%;">Đơn vị ${index + 1}</th>`).join('')}
          <th style="width: 28%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu kiểm tra cảm quan sản phẩm.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
