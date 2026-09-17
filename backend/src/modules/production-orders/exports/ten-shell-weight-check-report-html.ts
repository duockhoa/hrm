import type { ProductionOrderTenShellWeightChecks } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  number,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildTenShellWeightCheckHtmlRecord =
  ProductionOrderTenShellWeightChecks & {
    createdBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Khối lượng 10 vỏ".
export async function buildTenShellWeightCheckHtml(
  checks: buildTenShellWeightCheckHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Khối lượng 10 vỏ', number(check.ten_shells_weight));
    rows += row('Đơn vị', check.unit);
    rows += row('Người nhập', user(check.createdBy));
  }
  return sectionPage(
    'ten_shell_weight_check',
    'Khối lượng 10 vỏ',
    rows,
    metadata,
  );
}
