import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { UnprocessableEntityException } from '@nestjs/common';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildDeviationsHtml,
  type DeviationForReport,
} from './deviations-report-html';

const metadata = {
  appInfo: 'EBR',
  headerTitle: 'LOT-001',
  printTime: '21:51 01/10/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};
const order = {
  id: 1,
  item_code: 'SP001',
  description: 'Sản phẩm',
  lot_no: 'LOT-001',
};
const record = (id = 1): DeviationForReport =>
  ({
    id,
    production_order_id: 1,
    deviation_content: 'Sai lệch <kiểm tra>\nDòng thứ hai',
    cause: 'Nguyên nhân chi tiết',
    cause_classification: 'Thiết bị',
    handling_plan: 'Phương án đầy đủ',
    handling_result: 'Kết quả xử lý',
    affected_quantity: 0,
    affected_quantity_unit: 'Lọ',
    handled_quantity: 2,
    handled_quantity_unit: 'kg',
    destroyed_quantity: 3,
    destroyed_quantity_unit: 'g',
    reporter_id: 1,
    approver_id: 2,
    reporter: { name: 'Người báo cáo' },
    approver: { name: 'Người phê duyệt' },
    created_at: new Date('2026-10-01T14:51:00Z'),
    updated_at: new Date('2026-10-01T15:00:00Z'),
    deleted_at: null,
    images: [],
  }) as unknown as DeviationForReport;

async function fullHtml(records: DeviationForReport[]) {
  const renderer = new ProductionOrderPdfRendererService();
  const render = jest
    .spyOn(renderer, 'render')
    .mockResolvedValue(Buffer.from('%PDF-'));
  await new ProductionOrderExportService(renderer).exportBatchReport({
    ...order,
    planned_quatity: 1000,
    unit: 'Lọ',
    deviations: records,
    featureConfig: {
      sections: [{ key: 'production_order_deviations', enabled: true }],
    },
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Deviation detail report', () => {
  afterEach(() => jest.restoreAllMocks());
  it('renders one page per deviation with every entered field, preserved line breaks and no STT', async () => {
    const html = await buildDeviationsHtml(
      [record(1), record(2)],
      order,
      metadata,
    );
    expect(html.match(/data-deviation-id=/g)).toHaveLength(2);
    for (const value of [
      'Sai lệch &lt;kiểm tra&gt;\nDòng thứ hai',
      'Nguyên nhân chi tiết',
      'Thiết bị',
      'Phương án đầy đủ',
      'Kết quả xử lý',
      '0 Lọ',
      '2 kg',
      '3 g',
      'Người báo cáo',
      'Người phê duyệt',
      '21:51 01/10/2026',
      '22:00 01/10/2026',
    ])
      expect(html).toContain(value);
    expect(html).not.toContain('STT');
    expect(html).not.toContain('<kiểm tra>');
  });
  it('shows missing data and unapproved records explicitly', async () => {
    const html = await buildDeviationsHtml(
      [{ ...record(), approver: null, cause: null }],
      order,
      metadata,
    );
    expect(html).toContain('Chưa duyệt');
    expect(html).toContain('Không có hình ảnh đính kèm.');
    expect(await buildDeviationsHtml([], order, metadata)).toContain(
      'Không có sai lệch nào',
    );
  });
  it('loads only live images and reports missing files without losing other fields', async () => {
    const html = await buildDeviationsHtml(
      [
        {
          ...record(),
          images: [
            { image_path: '/production-order-deviations/images/missing.jpg' },
            {
              image_path: '/production-order-deviations/images/deleted.jpg',
              deleted_at: new Date(),
            },
          ],
        },
      ],
      order,
      metadata,
    );
    expect(html).toContain('Không thể hiển thị ảnh: missing.jpg');
    expect(html).not.toContain('deleted.jpg');
    expect(html).toContain('Phương án đầy đủ');
  });
});

const describePdf =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describePdf('Deviation PDF layout', () => {
  afterEach(() => jest.restoreAllMocks());
  it('keeps each deviation and its images on one readable A4 page', async () => {
    const directory = path.join(
      process.cwd(),
      'uploads',
      'production-order-deviations',
    );
    const filename = `pdf-test-${randomUUID()}.png`;
    await fs.mkdir(directory, { recursive: true });
    await fs.copyFile(
      path.join(process.cwd(), 'templates', 'batch-report', 'logo.png'),
      path.join(directory, filename),
    );
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      const input = record();
      input.images = Array.from({ length: 10 }, () => ({
        image_path: `/production-order-deviations/images/${filename}`,
      }));
      const html = await fullHtml([input, record(2)]);
      expect(html.match(/alt="Hình ảnh sai lệch/g)).toHaveLength(10);
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ javaScriptEnabled: false });
      jest.spyOn(chromium, 'launch').mockResolvedValue(browser);
      jest.spyOn(browser, 'newPage').mockResolvedValue(page);
      const pdf = page.pdf.bind(page);
      jest.spyOn(page, 'pdf').mockImplementation(async (options) => {
        const layout = await page.evaluate(() =>
          Array.from(
            document.querySelectorAll<HTMLElement>('.deviation-detail-page'),
          ).map((sheet) => ({
            id: sheet.dataset.deviationId,
            images: sheet.querySelectorAll('.deviation-image-gallery img')
              .length,
            font: getComputedStyle(
              sheet.querySelector('.deviation-detail-content')!,
            ).fontSize,
            fits:
              sheet
                .querySelector('.deviation-detail-content')!
                .getBoundingClientRect().bottom <=
              sheet.querySelector('.page-footer')!.getBoundingClientRect().top,
            imageFits: Array.from(sheet.querySelectorAll('figure')).every(
              (figure) => figure.scrollHeight <= figure.clientHeight,
            ),
            height: sheet.getBoundingClientRect().height,
          })),
        );
        expect(layout.map((item) => item.id)).toEqual(['1', '2']);
        expect(layout.map((item) => item.images)).toEqual([10, 0]);
        for (const item of layout) {
          expect(item.font).toBe('16px');
          expect(item.fits).toBe(true);
          expect(item.imageFits).toBe(true);
          expect(item.height).toBeCloseTo(1122.52, 0);
        }
        return pdf(options);
      });
      const buffer = await new ProductionOrderPdfRendererService().render(html);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    } finally {
      await browser?.close();
      await fs.unlink(path.join(directory, filename));
    }
  }, 60000);
  it('rejects oversized content rather than hiding entered data behind the footer', async () => {
    const html = await fullHtml([
      { ...record(), deviation_content: 'Nội dung dài\n'.repeat(150) },
    ]);
    await expect(
      new ProductionOrderPdfRendererService().render(html),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  }, 60000);
});
