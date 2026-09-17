import type { ProductionOrderPrimaryPackagingConfirmations } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildPrimaryPackagingConfirmationsHtmlRecord =
  ProductionOrderPrimaryPackagingConfirmations & {
    createdBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Xác nhận trước đóng gói bao bì cấp 1".
export async function buildPrimaryPackagingConfirmationsHtml(
  checks: buildPrimaryPackagingConfirmationsHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row(
      'Kiểm tra thể tích / khối lượng',
      check.volume_weight_checked ? 'Đã kiểm tra' : 'Chưa kiểm tra',
    );
    rows += row(
      'Kiểm tra cảm quan',
      check.sensory_checked ? 'Đã kiểm tra' : 'Chưa kiểm tra',
    );
    rows += row(
      'Kiểm tra in date',
      check.date_print_checked ? 'Đã kiểm tra' : 'Chưa kiểm tra',
    );
    rows += row(
      'Kiểm tra vệ sinh',
      check.hygiene_checked ? 'Đã kiểm tra' : 'Chưa kiểm tra',
    );
    rows += row(
      'Kiểm tra độ kín',
      check.seal_integrity_checked ? 'Đã kiểm tra' : 'Chưa kiểm tra',
    );
    rows += row('Ghi chú', check.note);
    rows += row('Người nhập', user(check.createdBy));
  }
  return sectionPage(
    'primary_packaging_confirmations',
    'Xác nhận trước đóng gói bao bì cấp 1',
    rows,
    metadata,
  );
}
