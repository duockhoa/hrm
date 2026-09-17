import type { ProductionOrderFinishedProductSummaries } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  number,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildFinishedProductSummaryHtmlRecord =
  ProductionOrderFinishedProductSummaries & {
    createdBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Tổng kết thành phẩm".
export async function buildFinishedProductSummaryHtml(
  checks: buildFinishedProductSummaryHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Số kiện', number(check.package_count));
    rows += row('Số hộp / kiện', number(check.boxes_per_package));
    rows += row('Số hộp lẻ', number(check.loose_box_count));
    rows += row(
      'Tổng số hộp',
      number(
        check.package_count * check.boxes_per_package + check.loose_box_count,
      ),
    );
    rows += row('Ghi chú', check.note);
    rows += row('Người nhập', user(check.createdBy));
  }
  return sectionPage(
    'finished_product_summary',
    'Tổng kết thành phẩm',
    rows,
    metadata,
  );
}
