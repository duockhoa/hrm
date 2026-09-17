import type { Prisma } from '@prisma/client';
import {
  text,
  date,
  user,
  reportImage,
  type ReportMetadata,
} from './report-section-layout';

// Read the saved record, including its edited structure, rather than the source template.
export const mixingRecordsReportInclude = {
  createdBy: { select: { name: true, username: true } },
  qaStaffApprovedBy: { select: { name: true, username: true } },
  ipcStaffApprovedBy: { select: { name: true, username: true } },
  stages: {
    orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    include: {
      steps: {
        orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
        include: {
          parameters: {
            orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
            include: { recordedBy: { select: { name: true, username: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductionOrderMixingRecordsInclude;

export type MixingRecordForReport =
  Prisma.ProductionOrderMixingRecordsGetPayload<{
    include: typeof mixingRecordsReportInclude;
  }>;
type Parameter =
  MixingRecordForReport['stages'][number]['steps'][number]['parameters'][number];
type Order = {
  item_code: string;
  description: string;
  lot_no: string;
  planned_quatity: number;
  unit: string;
  item?: { item_name: string } | null;
};

const result = (parameter: Parameter) => {
  const value = parameter.result_value;
  if (parameter.data_type === 'boolean') {
    return `${value === 'true' || value === '1' ? '☑' : '☐'} Đúng &nbsp; ${value === 'false' || value === '0' ? '☑' : '☐'} Sai`;
  }
  if (value == null || value === '') return '';
  if (
    parameter.data_type === 'datetime' &&
    !Number.isNaN(new Date(value).getTime())
  )
    return text(date(new Date(value)));
  if (parameter.data_type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return text(value.split('-').reverse().join('/'));
  return text(value);
};

export async function buildMixingRecordsHtml(
  records: MixingRecordForReport[],
  order: Order,
  metadata: ReportMetadata & { logoDataUri: string },
) {
  const page = (
    content: string,
    id: number | '',
  ) => `<main class="report-page page-break mixing-record-page" data-action-key="view_mixing_record" data-record-id="${id}">
    <img class="watermark" src="${text(metadata.watermarkDataUri)}" alt="Watermark">
    <div class="page-header"><span>${text(metadata.appInfo)}</span><span>Báo cáo lô sản xuất</span><span>Support 21 CFR 11</span></div>
    ${content}
    <div class="page-footer"><span style="flex:1">${text(metadata.printTime)}</span><span style="flex:1;text-align:center">${text(metadata.printerName)}</span></div>
  </main>`;
  if (!records.length)
    return page(
      '<h2>Phiếu pha chế</h2><p>Lệnh sản xuất chưa có phiếu pha chế.</p>',
      '',
    );
  let html = '';
  for (const record of records) {
    let rows = '';
    for (const stage of [...record.stages].sort(
      (a, b) => a.stage_order - b.stage_order,
    )) {
      rows += `<tr data-stage-header="${stage.id}"><td colspan="6"><strong>Giai đoạn ${text(stage.stage_order)}: ${text(stage.stage_name)}</strong></td></tr>`;
      for (const step of [...stage.steps].sort(
        (a, b) => a.step_order - b.step_order,
      )) {
        const stepCell = `<td data-step-cell="${step.id}">Bước ${text(step.step_order)}: ${text(step.step_name)}</td>`;
        const attributes = `data-stage-id="${stage.id}" data-step-id="${step.id}"`;
        if (!step.parameters.length)
          rows += `<tr ${attributes}>${stepCell}<td></td><td></td><td></td><td></td><td></td></tr>`;
        for (const parameter of [...step.parameters].sort(
          (a, b) => a.parameter_order - b.parameter_order,
        )) {
          rows += `<tr ${attributes} data-parameter-id="${parameter.id}">${stepCell}
            <td><strong>${text(parameter.parameter_name)}:</strong> ${text(parameter.requirement)}</td>
            <td>${result(parameter)}${parameter.unit ? ` <span>${text(parameter.unit)}</span>` : ''}</td>
            <td>${text(parameter.note ?? '')}</td>
            <td class="mixing-image">${parameter.result_image_path ? await reportImage(parameter.parameter_name, parameter.result_image_path) : ''}</td>
            <td class="mixing-performer">${text(parameter.recordedBy ? user(parameter.recordedBy) : '')}${parameter.recorded_at ? `<br><small>${text(date(parameter.recorded_at))}</small>` : ''}</td>
          </tr>`;
        }
      }
    }
    if (!record.stages.length)
      rows = '<tr><td colspan="6">Phiếu chưa có giai đoạn pha chế.</td></tr>';
    rows += `<tr class="mixing-approvals"><td colspan="3"><strong>Nhân viên ĐBCL</strong>
      <p>${record.qa_staff_approved_at ? '☑ Đã duyệt' : '☐ Chưa duyệt'}</p><p>Tên: ${text(user(record.qaStaffApprovedBy))}</p><p>Thời điểm duyệt: ${text(date(record.qa_staff_approved_at))}</p></td>
      <td colspan="3"><strong>Nhân viên IPC</strong><p>${record.ipc_staff_approved_at ? '☑ Đã duyệt' : '☐ Chưa duyệt'}</p><p>Tên: ${text(user(record.ipcStaffApprovedBy))}</p><p>Thời điểm duyệt: ${text(date(record.ipc_staff_approved_at))}</p></td></tr>`;
    const typeLabel =
      {
        mixing: 'Phiếu pha chế',
        primary_packaging_processing: 'Phiếu xử lý bao bì cấp 1',
        other: 'Khác',
      }[record.record_type] ?? record.record_type;
    html += page(
      `<table class="mixing-form-header"><colgroup><col style="width:22%"><col><col style="width:24%"></colgroup><tbody>
      <tr><td rowspan="3" style="text-align:center"><img src="${text(metadata.logoDataUri)}" alt="DK Pharma" style="width:32mm;max-width:100%"></td>
      <th rowspan="3" style="text-align:center;font-size:16pt;text-transform:uppercase">Theo dõi quá trình<br>Pha chế</th><td>Mã hiệu: BMDB004.01</td></tr>
      <tr><td>Ngày ban hành:<br>23/08/2026</td></tr><tr><td>Lần ban hành: 02</td></tr></tbody></table>
      <table class="mixing-info"><colgroup><col style="width:22%"><col><col style="width:16%"><col style="width:24%"></colgroup><tbody>
        <tr><th>Tên sản phẩm:</th><td><strong>${text(order.item?.item_name ?? order.description)}</strong></td><th>Mã sản phẩm:</th><td>${text(order.item_code)}</td></tr>
        <tr><th>Cỡ lô:</th><td>${text(Number(order.planned_quatity).toLocaleString('vi-VN', { maximumFractionDigits: 6 }))} ${text(order.unit)}</td><th>Số lô:</th><td>${text(order.lot_no)}</td></tr>
        <tr><th>Loại phiếu:</th><td>${text(typeLabel)}</td><th>Phiên bản:</th><td>${text(record.template_version ?? '')}</td></tr>
        <tr><th>Mô tả:</th><td colspan="3">${text(record.description ?? '')}</td></tr>
        <tr><th>Người tạo:</th><td>${text(user(record.createdBy))}</td><th>Ngày tạo:</th><td>${text(date(record.created_at))}</td></tr>
      </tbody></table>
      <table class="mixing-content"><colgroup><col style="width:17%"><col style="width:33%"><col style="width:14%"><col style="width:14%"><col style="width:8%"><col style="width:14%"></colgroup>
        <thead><tr><th>Nội dung kiểm tra</th><th>Yêu cầu</th><th>Thực tế</th><th>Ghi chú</th><th>Hình ảnh</th><th>Người thực hiện</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      record.id,
    );
  }
  return html;
}
