import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export type ReportMetadata = {
  appInfo: string;
  printTime: string;
  printerName: string;
  watermarkDataUri: string;
};
export type ReportUser = { name?: string | null; username?: string | null };
export const text = (value: unknown) =>
  String(value ?? '—').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
export const user = (value?: ReportUser | null) =>
  value?.name || value?.username || '—';
export const date = (value?: Date | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'short',
        timeStyle: 'short',
        hourCycle: 'h23',
      }).format(value)
    : '—';
export const number = (value: unknown) =>
  value == null
    ? '—'
    : Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
export const approval = (value?: string | null) =>
  ({ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' })[
    value ?? ''
  ] ??
  value ??
  '—';
export const row = (label: string, value: unknown) =>
  `<tr><td style="width:38%;font-weight:bold">${text(label)}</td><td style="white-space:pre-wrap;overflow-wrap:anywhere">${text(value)}</td></tr>`;

// Only layout/formatting is shared. Each section owns its fields and HTML.
export function sectionPage(
  key: string,
  title: string,
  rows: string,
  metadata: ReportMetadata,
) {
  return `<main class="report-page page-break additional-report-page" data-section-key="${text(key)}">
    ${metadata.watermarkDataUri ? `<img class="watermark" src="${text(metadata.watermarkDataUri)}" alt="Watermark">` : ''}
    <div class="page-header"><span>${text(metadata.appInfo)}</span><span>Báo cáo lô sản xuất</span><span>Support 21 CFR 11</span></div>
    <h2 style="text-align:center;font-size:16pt;margin:5mm 0 6mm;text-transform:uppercase">${text(title)}</h2>
    <table class="deviations-table" aria-label="${text(title)}"><thead><tr><th style="width:38%">Nội dung</th><th>Kết quả / thông tin</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="2" style="text-align:center">Chưa có dữ liệu.</td></tr>'}</tbody></table>
    <div class="page-footer"><span style="flex:1">${text(metadata.printTime)}</span><span style="flex:1;text-align:center">${text(metadata.printerName)}</span></div>
  </main>`;
}

// Embed local uploads; the PDF browser deliberately cannot fetch authenticated URLs.
export async function imageRow(
  label: string,
  storedPath?: string | null,
): Promise<string> {
  return `<tr><td>${text(label)}</td><td>${await reportImage(label, storedPath)}</td></tr>`;
}

export async function reportImage(
  label: string,
  storedPath?: string | null,
): Promise<string> {
  if (!storedPath) return '—';
  const routes: Record<string, string> = {
    '/production-orders/mixing-record-parameters/images/':
      'production-order-mixing-record-parameters/images',
    '/production-orders/attachments/files/': 'production-order-attachments',
    '/production-orders/date-checks/images/':
      'production-order-date-checks/images',
    '/production-orders/date-checks/request-files/':
      'production-order-date-checks/request-files',
    '/production-orders/pre-secondary-packaging-checks/images/':
      'production-order-pre-secondary-packaging-checks/images',
    '/production-orders/post-preparation-solution-checks/images/':
      'production-order-post-preparation-solution-checks/images',
    '/production-orders/material-process-summaries/images/':
      'production-order-material-process-summaries/images',
  };
  const route = Object.keys(routes).find((prefix) =>
    storedPath.startsWith(prefix),
  );
  if (!route) return 'Không thể tải tệp đính kèm';
  const filename = storedPath.slice(route.length);
  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    /[/\\\x00]/.test(filename)
  )
    return 'Đường dẫn tệp không hợp lệ';
  if (/\.(pdf|docx?|xlsx?|txt|csv)$/i.test(filename))
    return text(`Tệp đính kèm: ${filename}`);
  try {
    const directory = await fs.realpath(
      path.join(process.cwd(), 'uploads', routes[route]),
    );
    const file = await fs.realpath(path.join(directory, filename));
    if (!file.startsWith(directory + path.sep))
      return 'Đường dẫn tệp không hợp lệ';
    const buffer = await sharp(file)
      .rotate()
      .resize({
        width: 1400,
        height: 1400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    return `<img src="data:image/png;base64,${buffer.toString('base64')}" alt="${text(label)}" style="max-width:100%;max-height:140mm;object-fit:contain">`;
  } catch {
    return text(`Không thể hiển thị ảnh: ${filename}`);
  }
}
