import { Prisma } from '@prisma/client';
import { chromium } from 'playwright';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildVolumeChecksHtml,
  VolumeCheckForReport,
} from './volume-checks-report-html';

const check: VolumeCheckForReport = {
  package_type: 'lọ',
  dosage_form_stage: 'oral_solution',
  requirement: 'Kiểm tra <thể tích> & lưu kết quả',
  lower_limit: new Prisma.Decimal('9.50'),
  upper_limit: new Prisma.Decimal('10.50'),
  unit: 'ml',
  unit_1_volume: new Prisma.Decimal('10.25'),
  unit_2_volume: new Prisma.Decimal('10.30'),
  unit_3_volume: null,
  unit_4_volume: null,
  unit_5_volume: null,
  unit_6_volume: new Prisma.Decimal('10.10'),
  created_at: new Date('2026-09-13T01:30:00Z'),
  createdBy: { name: '<script>alert(1)</script>' },
};
const metadata = {
  appInfo: 'EBR',
  printTime: '13/09/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};

async function reportHtml(checks: VolumeCheckForReport[]) {
  const renderer = new ProductionOrderPdfRendererService();
  const render = jest
    .spyOn(renderer, 'render')
    .mockResolvedValue(Buffer.from('%PDF-'));
  await new ProductionOrderExportService(renderer).exportBatchReport({
    id: 1,
    item_code: 'BTP001',
    lot_no: '001',
    planned_quatity: 100,
    unit: 'Lọ',
    item: { item_name: 'Sản phẩm thử' },
    volumeChecks: checks,
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Volume checks batch report', () => {
  it('prints recorded values, Vietnam check time, and escaped user text', () => {
    const html = buildVolumeChecksHtml([check], metadata);
    expect(html).toContain('9,50 – 10,50 ml');
    expect(html).toContain('1: 10,25 ml');
    expect(html).toContain('2: 10,30 ml');
    expect(html).toContain('3: —');
    expect(html).toContain('6: 10,10 ml');
    expect(html).toContain('Kiểm tra &lt;thể tích&gt; &amp; lưu kết quả');
    expect(html).toContain('08:30');
    expect(html).toContain('13/09/2026');
    expect(html).toContain('lọ / Dung dịch uống');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('preserves zero and missing bounds without inferring limits from requirement text', () => {
    const html = buildVolumeChecksHtml(
      [{ ...check, lower_limit: new Prisma.Decimal(0), upper_limit: null }],
      metadata,
    );
    expect(html).toContain('0,00 – — ml');
    const missing = buildVolumeChecksHtml(
      [{ ...check, lower_limit: null, upper_limit: null }],
      metadata,
    );
    expect(missing).toContain('Chưa có');
  });

  it('includes a dedicated empty page when no checks exist', async () => {
    const html = await reportHtml([]);
    expect(html).toContain('Chưa có dữ liệu kiểm tra thể tích.');
    expect(
      html.indexOf('class="report-page page-break volume-check-page"'),
    ).toBeGreaterThan(html.indexOf('Kiểm tra vệ sinh'));
  });

  it('includes every recorded row and creator fallback in export HTML', async () => {
    const html = await reportHtml([
      { ...check, createdBy: { username: 'operator' } },
    ]);
    expect(html).toContain('>operator</td>');
    expect(html).toContain('Khoảng kiểm soát');
    expect(html).toContain('Thể tích đơn vị 1–6');
  });
});

const describeBrowser =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describeBrowser('Volume report pagination in Chromium', () => {
  it('keeps all rows above repeated footers and emits one PDF page per section', async () => {
    const checks = Array.from({ length: 90 }, (_, i) => ({
      ...check,
      requirement:
        `Kiểm tra ${i + 1} ` +
        'Thể tích kiểm soát 9,50 – 10,50 ml\n'.repeat((i % 5) + 1),
      createdBy: { name: 'Nguyễn Văn Kiểm Tra '.repeat((i % 4) + 1) },
    }));
    const fullHtml = await reportHtml(checks);
    // Isolate the new pages from pre-existing report sections for layout assertions.
    const styles = fullHtml
      .match(/<style>([\s\S]*?)<\/style>/)![1]
      .replace(/@import[^;]+;/g, '');
    const section = fullHtml.slice(
      fullHtml.indexOf(
        '<main class="report-page page-break volume-check-page"',
      ),
      fullHtml.indexOf(
        '</main>',
        fullHtml.indexOf(
          '<main class="report-page page-break volume-check-page"',
        ),
      ) + '</main>'.length,
    );
    const html = `<html><head><style>${styles}</style></head><body>${section}</body></html>`;
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ javaScriptEnabled: false });
      jest.spyOn(browser, 'newPage').mockResolvedValue(page);
      jest.spyOn(browser, 'close').mockResolvedValue();
      jest.spyOn(chromium, 'launch').mockResolvedValue(browser);
      const pdf = await new ProductionOrderPdfRendererService().render(html);
      const layout = await page.evaluate(() => {
        const pages = Array.from(
          document.querySelectorAll('.volume-check-page'),
        );
        return {
          count: pages.length,
          rowCount: document.querySelectorAll('tbody tr').length,
          footers: pages.map(
            (p) => p.querySelector('.page-footer')!.textContent,
          ),
          fits: pages.every((p) =>
            Array.from(p.querySelectorAll('tbody tr')).every(
              (row) =>
                row.getBoundingClientRect().bottom <=
                p.querySelector('.page-footer')!.getBoundingClientRect().top -
                  8,
            ),
          ),
        };
      });
      expect(layout.count).toBeGreaterThan(1);
      expect(layout.rowCount).toBe(90);
      expect(layout.fits).toBe(true);
      layout.footers.forEach((footer, index) =>
        expect(footer).toContain(`Trang ${index + 1} / ${layout.count}`),
      );
      expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(
        layout.count,
      );
    } finally {
      jest.restoreAllMocks();
      await browser.close();
    }
  }, 45_000);
});
