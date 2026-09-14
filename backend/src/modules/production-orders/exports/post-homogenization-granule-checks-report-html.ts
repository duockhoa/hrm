import type { ProductionOrderPostHomogenizationGranuleChecks } from '@prisma/client';

export type PostHomogenizationGranuleCheckForReport = Pick<
  ProductionOrderPostHomogenizationGranuleChecks,
  | 'bulk_density'
  | 'tapped_density'
  | 'density_unit'
  | 'carr_index'
  | 'moisture_percent'
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

export function buildPostHomogenizationGranuleChecksHtml(
  checks: PostHomogenizationGranuleCheckForReport[],
  metadata: {
    appInfo: string;
    printTime: string;
    printerName: string;
    watermarkDataUri: string;
  },
) {
  const formatNumber = (value: unknown, maximumFractionDigits: number) =>
    value == null
      ? '—'
      : Number(value).toLocaleString('vi-VN', {
          minimumFractionDigits: 0,
          maximumFractionDigits,
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
    <td style="text-align: right;">${formatNumber(check.bulk_density, 6)} ${escapeHtml(check.density_unit || 'g/ml')}</td>
    <td style="text-align: right;">${formatNumber(check.tapped_density, 6)} ${escapeHtml(check.density_unit || 'g/ml')}</td>
    <td style="text-align: right;">${formatNumber(check.carr_index, 4)}%</td>
    <td style="text-align: right;">${formatNumber(check.moisture_percent, 2)}${check.moisture_percent == null ? '' : '%'}</td>
    <td>${escapeHtml(check.createdBy?.name || check.createdBy?.username || '—')}</td>
  </tr>`,
    )
    .join('');

  return `<main class="report-page page-break post-homogenization-granule-check-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Kiểm tra cốm sau đồng nhất</h2>
      ${
        checks.length
          ? `<table class="deviations-table" aria-label="Kiểm tra cốm sau đồng nhất">
        <thead><tr>
          <th style="width: 7%;">STT</th>
          <th style="width: 19%;">Thời điểm kiểm tra</th>
          <th style="width: 18%;">Khối lượng riêng thô</th>
          <th style="width: 18%;">Khối lượng riêng gõ</th>
          <th style="width: 13%;">Chỉ số Carr</th>
          <th style="width: 11%;">Hàm ẩm</th>
          <th style="width: 14%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu kiểm tra cốm sau đồng nhất.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
