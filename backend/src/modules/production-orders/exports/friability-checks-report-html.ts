import type { ProductionOrderFriabilityChecks } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  number,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildFriabilityChecksHtmlRecord =
  ProductionOrderFriabilityChecks & {
    createdBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Kiểm tra độ mài mòn".
export async function buildFriabilityChecksHtml(
  checks: buildFriabilityChecksHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row(
      'Khối lượng trước kiểm tra',
      number(check.total_weight_before_check),
    );
    rows += row(
      'Khối lượng sau kiểm tra',
      number(check.total_weight_after_check),
    );
    rows += row('Đơn vị', check.weight_unit);
    rows += row('Độ mài mòn (%)', number(check.friability_percent));
    rows += row('Người nhập', user(check.createdBy));
  }
  return sectionPage(
    'friability_checks',
    'Kiểm tra độ mài mòn',
    rows,
    metadata,
  );
}
