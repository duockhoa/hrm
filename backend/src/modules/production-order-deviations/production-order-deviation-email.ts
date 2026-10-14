import type {
  Prisma,
  ProductionOrderDeviations,
  ProductionOrders,
} from '@prisma/client';
import type { EmailFileDto, SendEmailDto } from '../email/dto/send-email.dto';

type DeviationEmailUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

export type DeviationForEmail = ProductionOrderDeviations & {
  productionOrder: Pick<
    ProductionOrders,
    'id' | 'item_code' | 'description' | 'lot_no'
  > & {
    item?: { item_name: string } | null;
  };
  reporter?: DeviationEmailUser | null;
  approver?: DeviationEmailUser | null;
  images?: { image_path: string; deleted_at?: Date | null }[];
};

export type DeviationEmailImage = {
  key: string;
  label: string;
  file?: EmailFileDto;
};

export type DeviationEmailLogo = Pick<DeviationEmailImage, 'file'>;

type DisplayValue = string | number | null | undefined;

const text = (value: DisplayValue): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r\n|\r|\n/g, '<br>');

const userLabel = (user?: DeviationEmailUser | null) =>
  user?.name || user?.username || user?.email || '—';

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

const quantity = (value: Prisma.Decimal | null, unit: string | null) =>
  value == null ? '—' : [value.toString(), unit].filter(Boolean).join(' ');

export function buildProductionOrderDeviationEmail(
  deviation: DeviationForEmail,
  images: DeviationEmailImage[],
  logo?: DeviationEmailLogo,
): Omit<SendEmailDto, 'recipients' | 'emailTypeCode'> {
  const order = deviation.productionOrder;
  const product = order.item?.item_name || order.description || order.item_code;
  const fields: [string, DisplayValue][] = [
    ['Tên sản phẩm', product],
    ['Số lô', order.lot_no],
    ['Mã lệnh sản xuất', order.id],
    ['Nội dung sai lệch', deviation.deviation_content],
    ['Phương án xử lý', deviation.handling_plan],
    ['Kết quả xử lý', deviation.handling_result],
    ['Nguyên nhân', deviation.cause],
    ['Phân loại nguyên nhân', deviation.cause_classification],
    [
      'Số lượng ảnh hưởng',
      quantity(deviation.affected_quantity, deviation.affected_quantity_unit),
    ],
    [
      'Số lượng đã xử lý',
      quantity(deviation.handled_quantity, deviation.handled_quantity_unit),
    ],
    [
      'Số lượng đã hủy',
      quantity(deviation.destroyed_quantity, deviation.destroyed_quantity_unit),
    ],
    ['Người báo cáo', userLabel(deviation.reporter)],
    ['Người phê duyệt', userLabel(deviation.approver)],
    ['Ngày tạo', timestamp(deviation.created_at)],
  ];
  const render = () => {
    const logoSource = logo?.file ? 'cid:dkpharma_logo' : '';
    const branding = logoSource
      ? `<img src="${logoSource}" alt="DKPHARMA" width="200" style="display:block;width:200px;max-width:100%;height:auto;margin:0 auto 20px;border:0;outline:none;text-decoration:none">`
      : '<p style="margin:0 0 20px;color:#00796b;font-size:24px;font-weight:700;letter-spacing:1px">DKPHARMA</p>';
    const imageRows: string[] = [];
    for (let index = 0; index < images.length; index += 2) {
      imageRows.push(
        `<tr>${images
          .slice(index, index + 2)
          .map((image) => {
            const source = image.file ? `cid:${text(image.key)}` : '';
            return `<td style="width:50%;padding:8px;vertical-align:top;text-align:center">
          ${
            source
              ? `<img src="${source}" alt="${text(image.label)}" width="320" style="display:block;width:100%;max-width:320px;height:auto;margin:0 auto;border:1px solid #e5e7eb">`
              : '<p style="color:#6b7280">Không thể tải ảnh đính kèm.</p>'
          }
          <p style="margin:8px 0;color:#6b7280;font-size:12px">${text(image.label)}</p>
        </td>`;
          })
          .join('')}</tr>`,
      );
    }
    const gallery = images.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed">${imageRows.join('')}</table>`
      : '<p style="margin:0;color:#6b7280">Không có hình ảnh đính kèm.</p>';
    const rows = fields
      .map(
        ([label, value]) => `<tr>
      <th scope="row" style="width:34%;padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top;font-weight:600;color:#4b5563;background:#f9fafb">${text(label)}</th>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top;word-break:break-word">${text(value == null || value === '' ? '—' : value)}</td>
    </tr>${
      label === 'Nội dung sai lệch'
        ? `<tr><td colspan="2" style="padding:12px 14px;border-bottom:1px solid #e5e7eb"><h2 style="font-size:18px;margin:0 0 12px">Hình ảnh</h2>${gallery}</td></tr>`
        : ''
    }`,
      )
      .join('');
    return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sai lệch #${deviation.id}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">
  <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px">
    <tr><td align="center" style="padding:24px;border-bottom:1px solid #e5e7eb;text-align:center">
      ${branding}
      <p style="margin:0 0 8px;color:#00796b;font-size:12px;font-weight:700;text-transform:uppercase">Thông báo phiếu sai lệch mới</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="left" valign="middle" style="text-align:left;vertical-align:middle"><h1 style="margin:0;font-size:24px;line-height:1.3">Sai lệch #${deviation.id}</h1></td>
          <td align="right" valign="middle" style="text-align:right;vertical-align:middle;white-space:nowrap;color:#6b7280">${text(timestamp(deviation.created_at))}</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 24px"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed">${rows}</table></td></tr>
    <tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px">Thông tin được ghi nhận tại thời điểm tạo phiếu.</td></tr>
  </table>
</body></html>`;
  };

  return {
    subject: `Phiếu sai lệch #${deviation.id} - ${product} - Lô ${order.lot_no}`,
    message: [
      `Phiếu sai lệch mới #${deviation.id}`,
      ...fields.map(([label, value]) => `${label}: ${value ?? '—'}`),
    ].join('\n'),
    html: render(),
    inlineImages: Object.fromEntries([
      ...images
        .filter((image) => image.file)
        .map((image) => [image.key, image.file!]),
      ...(logo?.file ? [['dkpharma_logo', logo.file]] : []),
    ]),
  };
}
