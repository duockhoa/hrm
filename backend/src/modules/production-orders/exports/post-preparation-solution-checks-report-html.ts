import type { ProductionOrderPostPreparationSolutionChecks } from '@prisma/client';
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

export type buildPostPreparationSolutionChecksHtmlRecord =
  ProductionOrderPostPreparationSolutionChecks & {
    checkedBy?: ReportUser | null;
  };

// Dedicated layout: edit this file to change only "Kiểm tra dịch sau pha chế".
export async function buildPostPreparationSolutionChecksHtml(
  checks: buildPostPreparationSolutionChecksHtmlRecord[],
  metadata: ReportMetadata,
) {
  let rows = '';
  for (const [index, check] of checks.entries()) {
    rows += row('Bản ghi', index + 1);
    rows += row('Thời điểm tạo', date(check.created_at));
    rows += row('Màu sắc', check.solution_color);
    rows += row('Độ trong', check.solution_clarity);
    rows += row('pH lần 1', number(check.solution_ph_1));
    rows += row('pH lần 2', number(check.solution_ph_2));
    rows += row('pH lần 3', number(check.solution_ph_3));
    rows += row('Người kiểm tra', user(check.checkedBy));
    rows += await imageRow('Ảnh thể tích cuối', check.final_volume_image_path);
    rows += await imageRow('Ảnh dịch', check.solution_image_path);
  }
  return sectionPage(
    'post_preparation_solution_checks',
    'Kiểm tra dịch sau pha chế',
    rows,
    metadata,
  );
}
