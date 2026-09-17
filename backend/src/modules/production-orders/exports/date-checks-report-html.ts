import type { ProductionOrderDateChecks } from '@prisma/client';
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

export type buildDateChecksHtmlRecord = ProductionOrderDateChecks & {
  createdBy?: ReportUser | null;
  approvedBy?: ReportUser | null;

  images?: { image_path: string }[];
};

// Dedicated layout: edit this file to change only "Kiểm tra date".
export async function buildDateChecksHtml(
  checks: buildDateChecksHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row(
      'Loại bao bì',
      {
        goi: 'Gói',
        lo: 'Lọ',
        chai: 'Chai',
        hop: 'Hộp',
        thung: 'Thùng',
        ong_be: 'Ống bẻ',
        tui_nhom: 'Túi nhôm',
      }[check.package_type] ?? check.package_type,
    );
    rows += row('Thời điểm kiểm tra', date(check.checked_at));
    rows += row('Trạng thái phê duyệt', approval(check.approval_status));
    rows += row('Người duyệt', user(check.approvedBy));
    rows += row('Thời điểm duyệt', date(check.approved_at));
    rows += row('Người nhập', user(check.createdBy));
    rows += await imageRow('Mẫu yêu cầu', check.request_file_path);
    for (const [index, image] of (check.images ?? []).entries())
      rows += await imageRow('Ảnh ' + (index + 1), image.image_path);
  }
  return sectionPage('date_checks', 'Kiểm tra date', rows, metadata);
}
