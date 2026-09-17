import type { ProductionOrderMaterialProcessSummaries } from '@prisma/client';
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

export type buildMaterialProcessSummariesHtmlRecord =
  ProductionOrderMaterialProcessSummaries & {
    createdBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Tổng kết quá trình nguyên liệu".
export async function buildMaterialProcessSummariesHtml(
  checks: buildMaterialProcessSummariesHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Công đoạn', check.process_stage);
    rows += row('Số lượng thu được', number(check.yielded_quantity));
    rows += row('Đơn vị', check.yielded_unit);
    rows += row('Độ ẩm (%)', number(check.moisture_percent));
    rows += row('Ghi chú', check.note);
    rows += row('Người nhập', user(check.createdBy));
    rows += await imageRow('Ảnh tổng kết', check.image_path);
  }
  return sectionPage(
    'material_process_summaries',
    'Tổng kết quá trình nguyên liệu',
    rows,
    metadata,
  );
}
