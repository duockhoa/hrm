import type { ProductionOrderAttachments } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  approval,
  imageRow,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildProductionOrderAttachmentsHtmlRecord =
  ProductionOrderAttachments & {
    enteredBy?: ReportUser | null;
    approvedBy?: ReportUser | null;

    files?: {
      file_path: string;
      original_filename: string;
      note: string | null;
    }[];
  };

// Dedicated layout: edit this file to change only "Hình ảnh đính kèm".
export async function buildProductionOrderAttachmentsHtml(
  checks: buildProductionOrderAttachmentsHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row(
      'Loại đính kèm',
      {
        packaging_slip: 'Phiếu đóng gói',
        registration_number: 'Số đăng ký',
        production: 'Sản xuất',
        quality_check: 'Kiểm tra chất lượng',
        completion: 'Hoàn thành',
        defect: 'Lỗi',
      }[check.attachment_type] ?? check.attachment_type,
    );
    rows += row('Mô tả', check.description);
    rows += row('Thời điểm nhập', date(check.entered_at));
    rows += row('Yêu cầu phê duyệt', check.requires_approval ? 'Có' : 'Không');
    rows += row(
      'Trạng thái phê duyệt',
      check.requires_approval
        ? approval(check.approval_status)
        : 'Không yêu cầu duyệt',
    );
    rows += row('Người duyệt', user(check.approvedBy));
    rows += row('Thời điểm duyệt', date(check.approved_at));
    rows += row('Ghi chú phê duyệt', check.approval_note);
    rows += row('Người nhập', user(check.enteredBy));
    for (const file of check.files ?? []) {
      rows +=
        row('Tên tệp', file.original_filename) + row('Ghi chú ảnh', file.note);
      rows += await imageRow(file.original_filename, file.file_path);
    }
  }
  return sectionPage(
    'production_order_attachments',
    'Hình ảnh đính kèm',
    rows,
    metadata,
  );
}
