import type { ProductionOrderSecondaryPackagingChecks } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  number,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildSecondaryPackagingChecksHtmlRecord =
  ProductionOrderSecondaryPackagingChecks & {
    checkedBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Kiểm tra đóng gói bao bì cấp 2".
export async function buildSecondaryPackagingChecksHtml(
  checks: buildSecondaryPackagingChecksHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Công đoạn', check.stage);
    rows += row('Yêu cầu', check.requirement);
    rows += row('Số lượng kiểm tra', number(check.quantity_checked));
    rows += row('Số lượng đạt', number(check.quantity_passed));
    rows += row('Người kiểm tra', user(check.checkedBy));
  }
  return sectionPage(
    'secondary_packaging_checks',
    'Kiểm tra đóng gói bao bì cấp 2',
    rows,
    metadata,
  );
}
