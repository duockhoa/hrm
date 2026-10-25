import { Prisma } from '@prisma/client';
import { text, user, type ReportMetadata } from './report-section-layout';

export const weighingRecordsReportInclude = {
  createdBy: { select: { name: true, username: true } },
  qaStaffApprovedBy: { select: { name: true, username: true } },
  ipcStaffApprovedBy: { select: { name: true, username: true } },
  lines: {
    orderBy: [{ item_code: 'asc' }, { id: 'asc' }],
    include: {
      lotCheck: true,
      details: {
        orderBy: { id: 'asc' },
        include: { weighedBy: { select: { name: true, username: true } } },
      },
    },
  },
} satisfies Prisma.ProductionOrderWeighingRecordsInclude;

export type WeighingRecordForReport =
  Prisma.ProductionOrderWeighingRecordsGetPayload<{
    include: typeof weighingRecordsReportInclude;
  }>;
type Line = WeighingRecordForReport['lines'][number];
type Order = {
  item_code: string;
  description: string;
  lot_no: string;
  planned_quatity: number;
  unit: string;
  item?: { item_name: string } | null;
};

// Decimal arithmetic mirrors the frontend's six-place integer arithmetic.
const WeightDecimal = Prisma.Decimal.clone({ precision: 40 });
const total = (values: Prisma.Decimal[]) =>
  values.reduce((sum, value) => sum.plus(value), new WeightDecimal(0));
const weight = (value: Prisma.Decimal) => {
  const [whole, fraction] = value.abs().toFixed().split('.');
  return `${value.isNegative() && !value.isZero() ? '-' : ''}${BigInt(whole).toLocaleString('vi-VN')}${fraction ? `,${fraction}` : ''}`;
};
const weightStatus = (required: Prisma.Decimal, actual: Prisma.Decimal) => {
  const tolerance = required.gte(100000)
    ? 200
    : required.gte(10000)
      ? 100
      : required.gte(4000)
        ? 50
        : required.gte(10)
          ? 0.1
          : 0.02;
  return actual.lt(required.minus(tolerance))
    ? 'below'
    : actual.gt(required.plus(tolerance))
      ? 'above'
      : 'within';
};
const actualTotals = (lines: Line[]) => {
  const byUnit = new Map<string, Prisma.Decimal[]>();
  for (const line of lines) {
    for (const detail of line.details) {
      const values = byUnit.get(detail.unit) ?? [];
      values.push(detail.net_weight);
      byUnit.set(detail.unit, values);
    }
  }
  return [...byUnit].map(([unit, values]) => ({ unit, total: total(values) }));
};
const timestamp = (value: Date | null) =>
  value
    ? value.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hourCycle: 'h23',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

export function buildWeighingRecordsHtml(
  records: WeighingRecordForReport[],
  order: Order,
  metadata: ReportMetadata & { logoDataUri: string },
) {
  const page = (
    content: string,
    id: number | '',
  ) => `<main class="report-page page-break weighing-record-page" data-action-key="view_weighing_record" data-record-id="${id}">
    <img class="watermark" src="${text(metadata.watermarkDataUri)}" alt="Watermark">
    <div class="page-header"><span>${text(metadata.appInfo)}</span><span>${text(metadata.headerTitle || '—')}</span><span>Support 21 CFR 11</span></div>
    ${content}
    <div class="page-footer"><span style="flex:1">${text(metadata.printTime)}</span><span style="flex:1;text-align:center">${text(metadata.printerName)}</span></div>
  </main>`;
  if (!records.length)
    return page(
      '<h2>Phiếu cân</h2><p>Lệnh sản xuất chưa có phiếu cân.</p>',
      '',
    );

  return records
    .map((record) => {
      const lines = [...record.lines].sort(
        (a, b) =>
          a.item_code.localeCompare(b.item_code, 'vi', {
            sensitivity: 'base',
          }) || a.id - b.id,
      );
      const groups = new Map<string, Line[]>();
      for (const line of lines) {
        const key = JSON.stringify([line.item_code, line.unit]);
        const group = groups.get(key) ?? [];
        group.push(line);
        groups.set(key, group);
      }
      const rows = [...groups.values()]
        .map((group, index) => {
          const required = total(group.map((line) => line.planned_quantity));
          const actual = actualTotals(group);
          return group
            .map((line) => {
              const details = [...line.details].sort((a, b) => a.id - b.id);
              const ownTotals = actualTotals([line]);
              const lotClass = line.lotCheck
                ? line.lotCheck.is_correct
                  ? 'weighing-lot-correct'
                  : 'weighing-lot-incorrect'
                : '';
              return `<tr data-weighing-group="${index}" data-weighing-line-id="${line.id}">
          <td>${text(line.item_code)}</td>
          <td>${text(line.item_name)}${line.note ? `<p class="weighing-line-note">${text(line.note)}</p>` : ''}</td>
          <td class="${lotClass}">${text(line.lot_no || '—')}</td>
          <td class="weighing-number">${text(weight(line.planned_quantity))}</td>
          <td class="weighing-number weighing-group-total" data-weighing-total="required">${text(weight(required))}</td>
          <td class="weighing-number weighing-group-total" data-weighing-total="actual">${actual.length ? actual.map(({ unit, total: value }) => `<p class="weighing-actual-total">${unit === line.unit ? `<span class="weighing-status weighing-status-${weightStatus(required, value)}"></span>` : ''}<span>${text(weight(value))}${unit !== line.unit ? ` ${text(unit)}` : ''}</span></p>`).join('') : '<span class="weighing-empty">—</span>'}</td>
          <td>${details.length ? details.map((detail) => `${text(weight(detail.net_weight))}${detail.unit !== line.unit ? ` ${text(detail.unit)}` : ''}`).join(' + ') : '<span class="weighing-empty">—</span>'}</td>
          <td class="weighing-number">${ownTotals.length ? ownTotals.map(({ unit, total: value }) => `<p>${text(weight(value))}${unit !== line.unit || ownTotals.length > 1 ? ` ${text(unit)}` : ''}</p>`).join('') : '<span class="weighing-empty">—</span>'}</td>
          <td class="weighing-unit">${text(line.unit)}</td>
        </tr>`;
            })
            .join('');
        })
        .join('');
      const notes: string[] = [];
      const weighers = new Set<string>();
      for (const line of lines) {
        for (const detail of [...line.details].sort((a, b) => a.id - b.id)) {
          if (detail.note?.trim())
            notes.push(`${line.item_code}: ${detail.note.trim()}`);
          const name =
            detail.weighedBy?.name?.trim() ||
            detail.weighedBy?.username?.trim();
          if (name) weighers.add(name);
        }
      }
      const approval = (
        title: string,
        at: Date | null,
        person: typeof record.qaStaffApprovedBy,
      ) =>
        `<div class="weighing-approval"><strong>${title}</strong><p class="weighing-approved"><span class="weighing-checkbox${at ? ' checked' : ''}">${at ? '✓' : ''}</span> Đã duyệt</p><dl><dt>Tên</dt><dd>${text(user(person))}</dd><dt>Thời điểm duyệt</dt><dd>${text(timestamp(at))}</dd></dl></div>`;
      return page(
        `<table class="weighing-form-header"><colgroup><col style="width:22%"><col><col style="width:24%"></colgroup><tbody>
      <tr><td rowspan="3" class="weighing-logo"><img src="${text(metadata.logoDataUri)}" alt="DK Pharma"></td><th rowspan="3" class="weighing-title">Phiếu cân</th><td>Mã hiệu: BMDB005.01</td></tr>
      <tr><td>Ngày ban hành:<br>24/10/2026</td></tr><tr><td>Lần ban hành: 02</td></tr>
    </tbody></table>
    <table class="weighing-info"><colgroup><col style="width:22%"><col><col style="width:16%"><col style="width:24%"></colgroup><tbody>
      <tr><th>Tên sản phẩm:</th><td><strong>${text(order.item?.item_name ?? order.description)}</strong></td><th>Mã sản phẩm:</th><td><strong>${text(order.item_code)}</strong></td></tr>
      <tr><th>Cỡ lô:</th><td><strong>${text(Number(order.planned_quatity).toLocaleString('vi-VN', { maximumFractionDigits: 6 }))} ${text(order.unit)}</strong></td><th>Số lô:</th><td><strong>${text(order.lot_no)}</strong></td></tr>
      <tr><th>Mô tả:</th><td colspan="3">${text(record.description || '—')}</td></tr>
      <tr><th>Người tạo:</th><td>${text(user(record.createdBy))}</td><th>Ngày tạo:</th><td>${text(timestamp(record.created_at))}</td></tr>
    </tbody></table>
    <h3 class="weighing-material-title">Danh sách nguyên liệu</h3>
    <table class="weighing-content"><colgroup>${[9, 21, 12, 9, 9, 9, 12, 10, 9].map((width) => `<col style="width:${width}%">`).join('')}</colgroup>
      <thead><tr><th rowspan="2">Mã NL</th><th rowspan="2">Tên nguyên liệu</th><th rowspan="2">Số lô</th><th colspan="6">Số lượng/ Đơn vị</th></tr><tr>${['Yêu cầu', 'Tổng lượng YC', 'Tổng lượng TT', 'Thực tế', 'Tổng khối lượng', 'ĐVT'].map((label) => `<th>${label}</th>`).join('')}</tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="weighing-unit">Chưa có nguyên liệu trong phiếu cân.</td></tr>'}
        <tr class="weighing-summary"><td colspan="9"><strong>Ghi chú: </strong>${text(notes.join(', ') || '—')}</td></tr>
        <tr class="weighing-summary"><td colspan="9"><strong>Người cân: </strong>${text([...weighers].join(', ') || '—')}</td></tr>
        <tr class="weighing-approvals"><td colspan="9"><div class="weighing-approval-columns">${approval('Nhân viên ĐBCL', record.qa_staff_approved_at, record.qaStaffApprovedBy)}${approval('Nhân viên IPC', record.ipc_staff_approved_at, record.ipcStaffApprovedBy)}</div></td></tr>
      </tbody>
    </table>`,
        record.id,
      );
    })
    .join('');
}
