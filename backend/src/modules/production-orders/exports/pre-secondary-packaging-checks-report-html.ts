import type { ProductionOrderPreSecondaryPackagingChecks } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  number,
  imageRow,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildPreSecondaryPackagingChecksHtmlRecord =
  ProductionOrderPreSecondaryPackagingChecks & {
    createdBy?: ReportUser | null;

    images?: { image_path: string }[];
  };

// Dedicated layout: edit this file to change only "Kiểm tra BTP trước đóng gói bao bì cấp 2".
export async function buildPreSecondaryPackagingChecksHtml(
  checks: buildPreSecondaryPackagingChecksHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Yêu cầu', check.requirement);
    rows += row('Số lượng kiểm tra', number(check.quantity_checked));
    rows += row('Số lượng đạt', number(check.quantity_passed));
    rows += row('Người nhập', user(check.createdBy));
    for (const [index, image] of (check.images ?? []).entries())
      rows += await imageRow('Ảnh ' + (index + 1), image.image_path);
  }
  return sectionPage(
    'pre_secondary_packaging_checks',
    'Kiểm tra BTP trước đóng gói bao bì cấp 2',
    rows,
    metadata,
  );
}
