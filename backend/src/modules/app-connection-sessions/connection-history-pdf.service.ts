import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ProductionOrderPdfRendererService } from '../production-orders/exports/production-order-pdf-renderer.service';
import {
  AppConnectionSessionsService,
  type ConnectionApplicationKey,
} from './app-connection-sessions.service';
import type { ExportConnectionSessionsDto } from './dto/connection-sessions.dto';

const timeZone = 'Asia/Ho_Chi_Minh';
const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone,
});
const numberFormat = new Intl.NumberFormat('vi-VN');
const statusLabels = {
  connected: 'Đang kết nối',
  reconnecting: 'Chờ kết nối lại',
  ended: 'Đã kết thúc',
};
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function escapeHtml(value: string) {
  return value.replace(
    /[&<>]/g,
    (char: keyof typeof htmlEntities) => htmlEntities[char],
  );
}

function filterDate(value?: string) {
  return value ? value.split('-').reverse().join('/') : 'Không giới hạn';
}

function timestamp(value: Date | null) {
  return value ? dateTimeFormat.format(value) : '-';
}

function formatDuration(start: Date, end: Date) {
  const seconds = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / 1000),
  );
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours} giờ ${minutes} phút`;
  return minutes ? `${minutes} phút` : `${seconds} giây`;
}

@Injectable()
export class ConnectionHistoryPdfService {
  constructor(
    private readonly sessions: AppConnectionSessionsService,
    private readonly renderer: ProductionOrderPdfRendererService,
  ) {}

  async export(
    applicationKey: ConnectionApplicationKey,
    filters: ExportConnectionSessionsDto,
  ) {
    const exportedAt = new Date();
    const sessions = await this.sessions.findForExport(
      applicationKey,
      filters,
      exportedAt,
    );
    const assetDirectory = join(process.cwd(), 'templates', 'batch-report');
    const [logo, watermark] = await Promise.all([
      readFile(join(assetDirectory, 'logo.png'), 'base64'),
      readFile(join(assetDirectory, 'logo-removebg.png'), 'base64'),
    ]);
    const application = applicationKey === 'hsl' ? 'EBR' : 'WMS';
    const rows = sessions.map((session) => {
      const end = session.ended_at ?? session.disconnected_at;
      const durationEnd =
        end ??
        (session.status === 'connected' ? exportedAt : session.last_seen_at);
      const { name, username } = session.user;
      return `<tr>
        <td><strong>${escapeHtml(name || username)}</strong><br><small>#${session.id}${name ? ` · ${escapeHtml(username)}` : ''}</small></td>
        <td>${timestamp(session.connected_at)}</td>
        <td>${timestamp(session.last_seen_at)}</td>
        <td>${timestamp(end)}</td>
        <td>${formatDuration(session.connected_at, durationEnd)}</td>
        <td>${statusLabels[session.status]}</td>
        <td class="count">${session.connection_count}</td>
        <td>${escapeHtml(session.ip_address ?? '-')}</td>
      </tr>`;
    });

    return this.renderer.render(`<!doctype html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Lịch sử kết nối ${application}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm 12.7mm 14mm;
            @bottom-left { content: "Lịch sử kết nối ${application}"; font-size: 9pt; color: #475569; }
            @bottom-right { content: "Trang " counter(page) " / " counter(pages); font-size: 9pt; color: #475569; }
          }
          html { font-family: Arial, sans-serif; color: #0f172a; font-size: 10pt; }
          body { margin: 0; }
          .watermark { position: fixed; top: 50%; left: 50%; width: 180mm;
            transform: translate(-50%, -50%) rotate(45deg); opacity: 0.1; }
          .report-page { position: relative; }
          header { position: relative; padding: 0 40mm 4mm; text-align: center; break-inside: avoid; }
          header img { position: absolute; left: 0; top: 0; width: 32mm; }
          h1 { margin: 0 0 2mm; font-size: 18pt; }
          p { margin: 0 0 1mm; overflow-wrap: anywhere; }
          table { border-collapse: collapse; table-layout: fixed; width: 100%; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          th, td { border: 1px solid #94a3b8; padding: 1.6mm; text-align: left; overflow-wrap: anywhere; }
          th { background: #eef2f6; }
          small { color: #475569; }
          .count, .empty { text-align: center; }
        </style>
      </head>
      <body>
        <img class="watermark" src="data:image/png;base64,${watermark}" alt="">
        <section class="report-page">
          <header>
            <img src="data:image/png;base64,${logo}" alt="DKPharma">
            <h1>LỊCH SỬ KẾT NỐI ${application}</h1>
            <p>Từ ngày: ${filterDate(filters.connected_from)} | Đến ngày: ${filterDate(filters.connected_to)}</p>
            <p>Người dùng: ${escapeHtml(filters.keyword?.trim() || 'Tất cả')}</p>
            <p>Số phiên: ${numberFormat.format(sessions.length)} | Thời điểm xuất: ${timestamp(exportedAt)}</p>
          </header>
          <table>
            <colgroup>${[20, 14, 14, 14, 9, 10, 7, 12].map((width) => `<col style="width:${width}%">`).join('')}</colgroup>
            <thead><tr>
              <th>Phiên / Người dùng</th><th>Mở ${application} lúc</th><th>Lần cuối kết nối</th>
              <th>Ngắt / Kết thúc lúc</th><th>Thời lượng phiên</th><th>Trạng thái</th>
              <th class="count">Số lần kết nối</th><th>Địa chỉ IP</th>
            </tr></thead>
            <tbody>${rows.join('') || '<tr><td colspan="8" class="empty">Không có phiên kết nối phù hợp.</td></tr>'}</tbody>
          </table>
        </section>
      </body>
      </html>`);
  }
}
