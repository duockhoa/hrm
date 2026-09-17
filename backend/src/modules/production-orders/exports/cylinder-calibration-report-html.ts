import type { ProductionOrderCylinderCalibrations } from '@prisma/client';
import {
  sectionPage,
  row,
  date,
  user,
  number,
  type ReportMetadata,
  type ReportUser,
} from './report-section-layout';

export type buildCylinderCalibrationHtmlRecord =
  ProductionOrderCylinderCalibrations & {
    createdBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Hiệu chỉnh ống đong".
export async function buildCylinderCalibrationHtml(
  checks: buildCylinderCalibrationHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Mã ống đong', check.cylinder_code);
    rows += row('Số hiệu chỉnh', number(check.calibration_number));
    rows += row('Người nhập', user(check.createdBy));
  }
  return sectionPage(
    'cylinder_calibration',
    'Hiệu chỉnh ống đong',
    rows,
    metadata,
  );
}
