import type { ProductionOrderLeakTightnessChecks } from '@prisma/client';

export type LeakTightnessCheckForReport = Pick<
  ProductionOrderLeakTightnessChecks,
  | 'dosage_form_stage'
  | 'requirement'
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

export function buildLeakTightnessChecksHtml(
  checks: LeakTightnessCheckForReport[],
  metadata: {
    appInfo: string;
    printTime: string;
    printerName: string;
    watermarkDataUri: string;
  },
) {
  const formatResult = (value: boolean | null | undefined) => {
    if (value === true) return 'Đạt';
    if (value === false) return 'Không đạt';
    return '—';
  };

  const stageLabels: Record<string, string> = {
    blister: 'Vỉ',
    granule_package: 'Gói cốm',
    solution_package: 'Gói dịch',
    bottle: 'Lọ',
    tablet: 'Viên nén',
    capsule: 'Viên nang',
    film_coated_tablet: 'Viên nén bao phim',
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
    <td>${[
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
      .map((value, unitIndex) => `${unitIndex + 1}: ${formatResult(value)}`)
      .join('<br>')}</td>
    <td>${escapeHtml(check.createdBy?.name || check.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break leak-tightness-check-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Supports 21 CFR 11 Compliance</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Kiểm tra độ kín</h2>
      ${
        checks.length
          ? `<table class="deviations-table" aria-label="Kiểm tra độ kín">
        <thead><tr>
          <th style="width: 5%;">STT</th>
          <th style="width: 17%;">Thời điểm kiểm tra</th>
          <th style="width: 15%;">Dạng kiểm tra</th>
          <th style="width: 25%;">Yêu cầu</th>
          <th style="width: 20%;">Kết quả đơn vị 1–10</th>
          <th style="width: 18%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu kiểm tra độ kín.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
