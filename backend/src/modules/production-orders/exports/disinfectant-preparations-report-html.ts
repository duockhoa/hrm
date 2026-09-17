import type { ProductionOrderDisinfectantPreparations } from '@prisma/client';

export type DisinfectantPreparationForReport = Pick<
  ProductionOrderDisinfectantPreparations,
  | 'disinfectant_name'
  | 'purpose'
  | 'base_material_name'
  | 'base_material_content'
  | 'base_material_amount_l'
  | 'prepared_volume_l'
  | 'actual_concentration'
  | 'created_at'
> & {
  workshop?: { code?: string | null; name?: string | null } | null;
  createdBy?: { name?: string | null; username?: string | null } | null;
};

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export function buildDisinfectantPreparationsHtml(
  preparations: DisinfectantPreparationForReport[],
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
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        });
  const rows = preparations
    .map((preparation, index) => {
      const workshop = [preparation.workshop?.code, preparation.workshop?.name]
        .filter(Boolean)
        .join(' - ');
      return `<tr>
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
      }).format(preparation.created_at),
    )}</td>
    <td>${escapeHtml(workshop || '—')}</td>
    <td>${escapeHtml(preparation.disinfectant_name)}</td>
    <td>${escapeHtml(preparation.purpose)}</td>
    <td>${escapeHtml(preparation.base_material_name)}<br>Hàm lượng: ${formatNumber(preparation.base_material_content)}%</td>
    <td style="text-align: right;">${formatNumber(preparation.base_material_amount_l)} L</td>
    <td style="text-align: right;">${formatNumber(preparation.prepared_volume_l)} L</td>
    <td style="text-align: right;">${formatNumber(preparation.actual_concentration)}%</td>
    <td>${escapeHtml(preparation.createdBy?.name || preparation.createdBy?.username || '—')}</td>
  </tr>`;
    })
    .join('');

  return `<main class="report-page page-break disinfectant-preparation-page">
    <img class="watermark" src="${escapeHtml(metadata.watermarkDataUri)}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.appInfo)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.headerTitle || '—')}</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; margin-bottom: 6mm; text-transform: uppercase;">Pha chế chất sát khuẩn</h2>
      ${
        preparations.length
          ? `<table class="deviations-table" aria-label="Pha chế chất sát khuẩn">
        <thead><tr>
          <th style="width: 4%;">STT</th>
          <th style="width: 11%;">Thời điểm</th>
          <th style="width: 11%;">Xưởng</th>
          <th style="width: 10%;">Chất sát khuẩn</th>
          <th style="width: 13%;">Mục đích</th>
          <th style="width: 14%;">Nguyên liệu gốc</th>
          <th style="width: 8%;">Lượng nguyên liệu</th>
          <th style="width: 8%;">Thể tích pha chế</th>
          <th style="width: 8%;">Nồng độ thực tế</th>
          <th style="width: 13%;">Người nhập</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : '<p style="text-align: center; font-style: italic;">Chưa có dữ liệu pha chế chất sát khuẩn.</p>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${escapeHtml(metadata.printTime)}</span>
      <span style="flex: 1; text-align: center;">${escapeHtml(metadata.printerName)}</span>
    </div>
  </main>`;
}
