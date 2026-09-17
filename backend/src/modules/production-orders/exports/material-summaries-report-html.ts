import type { ProductionOrderMaterialSummaries } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  number,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildMaterialSummariesHtmlRecord =
  ProductionOrderMaterialSummaries & {
    createdBy?: ReportUser | null;

    summarizedBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Tổng kết vật liệu".
export async function buildMaterialSummariesHtml(
  checks: buildMaterialSummariesHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Mã vật liệu', check.material_code);
    rows += row('Tên vật liệu', check.material_name);
    rows += row('Số lô', check.lot_no);
    rows += row('Đơn vị', check.unit);
    rows += row('Số lượng nhận', number(check.received_quantity));
    rows += row('Số lượng sử dụng', number(check.used_quantity));
    rows += row(
      'Hao hụt do nhà cung cấp',
      number(check.supplier_waste_quantity),
    );
    rows += row('Hao hụt sản xuất', number(check.production_waste_quantity));
    rows += row('Số lượng còn lại', number(check.remaining_quantity));
    rows += row('Số lượng lấy mẫu', number(check.sample_quantity));
    rows += row('Người tổng kết', user(check.summarizedBy));
    rows += row('Người nhập', user(check.createdBy));
  }
  return sectionPage('material_summaries', 'Tổng kết vật liệu', rows, metadata);
}
