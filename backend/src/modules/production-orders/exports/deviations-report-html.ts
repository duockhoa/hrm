import type { ProductionOrderDeviations } from '@prisma/client';
import {
  text,
  user,
  number,
  reportImage,
  type ReportUser,
  type ReportMetadata,
} from './report-section-layout';

export type DeviationForReport = ProductionOrderDeviations & {
  reporter?: ReportUser | null;
  approver?: ReportUser | null;
  images?: { image_path: string; deleted_at?: Date | null }[];
};

const timestamp = (value?: Date | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(value)
    : '—';

export async function buildDeviationsHtml(
  records: DeviationForReport[],
  order: {
    id: number;
    item_code: string;
    description: string;
    lot_no: string;
    item?: { item_name: string } | null;
  },
  metadata: ReportMetadata,
) {
  const page = (
    body: string,
    id?: number,
  ) => `<main class="report-page page-break deviation-detail-page"${id == null ? '' : ` data-deviation-id="${id}"`}>
    <img class="watermark" src="${text(metadata.watermarkDataUri)}" alt="Watermark">
    <div class="page-header"><span>${text(metadata.appInfo)}</span><span>${text(metadata.headerTitle)}</span><span>Support 21 CFR 11</span></div>
    <div class="deviation-detail-content"><h2>Thông tin sai lệch</h2>${body}</div>
    <div class="page-footer"><span style="flex:1">${text(metadata.printTime)}</span><span style="flex:1;text-align:center">${text(metadata.printerName)}</span></div>
  </main>`;
  if (!records.length)
    return page(
      '<p>Không có sai lệch nào phát sinh trong quá trình sản xuất lô này.</p>',
    );
  const field = (label: string, value: unknown) =>
    `<tr><th>${text(label)}</th><td>${text(value == null || value === '' ? '—' : value)}</td></tr>`;
  const quantity = (value: unknown, unit: string | null) =>
    `${number(value)}${unit ? ` ${unit}` : ''}`;
  return (
    await Promise.all(
      records.map(async (record) => {
        const images = (record.images ?? []).filter(
          (image) => !image.deleted_at,
        );
        const gallery = images.length
          ? `<div class="deviation-image-gallery" style="grid-template-columns:repeat(${Math.min(images.length, 3)}, minmax(0, 1fr))">${(
              await Promise.all(
                images.map(
                  async (image, index) =>
                    `<figure>${await reportImage(`Hình ảnh sai lệch ${index + 1}`, image.image_path)}<figcaption>Hình ${index + 1}</figcaption></figure>`,
                ),
              )
            ).join('')}</div>`
          : '<p>Không có hình ảnh đính kèm.</p>';
        return page(
          `<table class="deviation-detail-table"><tbody>${[
            field('Tên sản phẩm', order.item?.item_name ?? order.description),
            field(
              'Mã sản phẩm / Số lô',
              `${order.item_code} / ${order.lot_no}`,
            ),
            field('Mã lệnh sản xuất', order.id),
            field('Nội dung sai lệch', record.deviation_content),
            field('Nguyên nhân', record.cause),
            field('Phân loại nguyên nhân', record.cause_classification),
            field('Phương án xử lý', record.handling_plan),
            field('Kết quả xử lý', record.handling_result),
            field(
              'Số lượng ảnh hưởng',
              quantity(record.affected_quantity, record.affected_quantity_unit),
            ),
            field(
              'Số lượng đã xử lý',
              quantity(record.handled_quantity, record.handled_quantity_unit),
            ),
            field(
              'Số lượng đã hủy',
              quantity(
                record.destroyed_quantity,
                record.destroyed_quantity_unit,
              ),
            ),
            field('Người báo cáo', user(record.reporter)),
            field(
              'Người phê duyệt',
              record.approver ? user(record.approver) : 'Chưa duyệt',
            ),
            field('Ngày tạo', timestamp(record.created_at)),
            field('Ngày cập nhật', timestamp(record.updated_at)),
          ].join('')}</tbody></table><h3>Hình ảnh sai lệch</h3>${gallery}`,
          record.id,
        );
      }),
    )
  ).join('');
}
