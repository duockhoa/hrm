import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';

type Order = Parameters<ProductionOrderExportService['exportBatchReport']>[0];
type Check = NonNullable<Order['sensoryChecks']>[number];
const check = (id: number, images: { image_path: string }[] = []): Check =>
  ({
    id,
    color: 'Màu <vàng>',
    smell: 'Mùi thơm',
    taste: 'Vị ngọt',
    note: 'Ghi chú',
    createdBy: { name: 'Người nhập' },
    created_at: new Date('2026-10-01T14:51:00Z'),
    images,
  }) as Check;
async function htmlFor(checks: Check[], enabled = true) {
  const renderer = new ProductionOrderPdfRendererService();
  const render = jest
    .spyOn(renderer, 'render')
    .mockResolvedValue(Buffer.from('%PDF-'));
  await new ProductionOrderExportService(renderer).exportBatchReport({
    id: 1,
    item_code: 'SP001',
    description: 'Sản phẩm',
    lot_no: 'LOT001',
    planned_quatity: 1000,
    unit: 'Lọ',
    sensoryChecks: checks,
    featureConfig: { sections: [{ key: 'sensory_checks', enabled }] },
  } as Order);
  return render.mock.calls[0][0];
}

describe('Taste-check image rows', () => {
  afterEach(() => jest.restoreAllMocks());
  it('adds an image row only below records with images, spanning all seven columns', async () => {
    const html = await htmlFor([
      check(1),
      check(2, [
        { image_path: '/production-orders/sensory-checks/images/missing.png' },
      ]),
    ]);
    expect(html.match(/class="taste-check-image-row"/g)).toHaveLength(1);
    expect(html).toMatch(
      /Người nhập<\/td>\s*<\/tr><tr class="taste-check-image-row" data-taste-check-id="2"><td colspan="7">/,
    );
    expect(html).toContain('Không thể hiển thị ảnh: missing.png');
    expect(html).toContain('Màu &lt;vàng&gt;');
  });
  it('preserves the empty state and feature visibility', async () => {
    expect(await htmlFor([])).toContain('Chưa có dữ liệu thử mùi vị');
    expect(await htmlFor([check(1)], false)).not.toContain(
      '<main class="report-page page-break taste-check-page">',
    );
  });
});

const describePdf =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describePdf('Taste-check PDF pagination', () => {
  afterEach(() => jest.restoreAllMocks());
  it('embeds every image and keeps each image row with its record across page breaks', async () => {
    const directory = path.join(
      process.cwd(),
      'uploads',
      'production-order-sensory-checks',
      'images',
    );
    const filename = `pdf-test-${randomUUID()}.png`;
    await fs.mkdir(directory, { recursive: true });
    await sharp({
      create: { width: 400, height: 400, channels: 3, background: '#abcdef' },
    })
      .png()
      .toFile(path.join(directory, filename));
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      const image = {
        image_path: `/production-orders/sensory-checks/images/${filename}`,
      };
      const checks = Array.from({ length: 20 }, (_, index) =>
        check(index + 1, index % 2 ? [image, image] : []),
      );
      const html = await htmlFor(checks);
      expect(html.match(/alt="Hình ảnh thử mùi vị/g)).toHaveLength(20);
      expect(html).not.toContain('Không thể hiển thị ảnh');
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ javaScriptEnabled: false });
      jest.spyOn(chromium, 'launch').mockResolvedValue(browser);
      jest.spyOn(browser, 'newPage').mockResolvedValue(page);
      const pdf = page.pdf.bind(page);
      jest.spyOn(page, 'pdf').mockImplementation(async (options) => {
        const layout = await page.evaluate(() => {
          const pages = Array.from(
            document.querySelectorAll('.taste-check-page'),
          );
          return {
            pages: pages.length,
            ids: Array.from(
              document.querySelectorAll<HTMLElement>(
                '.taste-check-page tbody tr:not(.taste-check-image-row)',
              ),
            ).map((row) => row.dataset.tasteCheckId),
            images: document.querySelectorAll('.taste-check-images img').length,
            paired: Array.from(
              document.querySelectorAll<HTMLElement>('.taste-check-image-row'),
            ).every(
              (row) =>
                (row.previousElementSibling as HTMLElement)?.dataset
                  .tasteCheckId === row.dataset.tasteCheckId,
            ),
            fits: pages.every(
              (sheet) =>
                sheet.querySelector('table')!.getBoundingClientRect().bottom <=
                sheet.querySelector('.page-footer')!.getBoundingClientRect()
                  .top,
            ),
          };
        });
        expect(layout.pages).toBeGreaterThan(1);
        expect(layout.ids).toEqual(checks.map((item) => String(item.id)));
        expect(layout.images).toBe(20);
        expect(layout.paired).toBe(true);
        expect(layout.fits).toBe(true);
        return pdf(options);
      });
      const buffer = await new ProductionOrderPdfRendererService().render(html);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    } finally {
      await browser?.close();
      await fs.unlink(path.join(directory, filename));
    }
  }, 60000);
});
