import type { ProductionOrderFactoryReleaseReviews } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildFactoryReleaseReviewsHtmlRecord =
  ProductionOrderFactoryReleaseReviews & {
    approvedBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Xét duyệt xuất xưởng".
export async function buildFactoryReleaseReviewsHtml(
  checks: buildFactoryReleaseReviewsHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Số đăng ký', check.registration_number);
    rows += row(
      'Kết quả kiểm nghiệm nguyên liệu',
      check.raw_material_test_result,
    );
    rows += row('Kết quả kiểm nghiệm nước', check.water_test_result);
    rows += row(
      'Kết quả kiểm nghiệm khí nén',
      check.compressed_air_test_result,
    );
    rows += row(
      'Kết quả kiểm tra tính toàn vẹn màng lọc',
      check.filter_integrity_test_result,
    );
    rows += row('Kết quả kiểm tra bao bì', check.packaging_inspection_result);
    rows += row(
      'Kết quả kiểm nghiệm thành phẩm',
      check.finished_product_test_result,
    );
    rows += row('Kết quả tiệt trùng', check.sterilization_result);
    rows += row('Kết quả tiểu phân online', check.online_particle_result);
    rows += row('Sản lượng', check.yield_quantity);
    rows += row('Sai lệch', check.deviation);
    rows += row(
      'Kết quả giám sát môi trường',
      check.environment_monitoring_result,
    );
    rows += row('Người duyệt', user(check.approvedBy));
  }
  return sectionPage(
    'factory_release_reviews',
    'Xét duyệt xuất xưởng',
    rows,
    metadata,
  );
}
