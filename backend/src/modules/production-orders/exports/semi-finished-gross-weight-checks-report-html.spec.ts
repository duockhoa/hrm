import { Prisma } from '@prisma/client';
import { chromium } from 'playwright';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildSemiFinishedGrossWeightChecksHtml,
  type SemiFinishedGrossWeightCheckForReport,
} from './semi-finished-gross-weight-checks-report-html';

const check: SemiFinishedGrossWeightCheckForReport = {
  dosage_form_stage: 'granule_package',
  requirement: 'Kiểm tra <khối lượng cả bì> & lưu kết quả',
  lower_limit: new Prisma.Decimal('1.850'),
  upper_limit: new Prisma.Decimal('2.150'),
  unit: 'g',
  unit_1_gross_weight: new Prisma.Decimal('2.015'),
  unit_2_gross_weight: new Prisma.Decimal('1.980'),
  unit_3_gross_weight: null,
  unit_4_gross_weight: null,
  unit_5_gross_weight: null,
  unit_6_gross_weight: null,
  unit_7_gross_weight: null,
  unit_8_gross_weight: null,
  unit_9_gross_weight: null,
  unit_10_gross_weight: new Prisma.Decimal('2.050'),
  created_at: new Date('2026-09-13T01:30:00Z'),
  createdBy: { name: '<script>alert(1)</script>' },
};

const metadata = {
  appInfo: 'EBR',
  printTime: '13/09/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};

async function reportHtml(checks: SemiFinishedGrossWeightCheckForReport[]) {
  const renderer = new ProductionOrderPdfRendererService();
  const render = jest
    .spyOn(renderer, 'render')
    .mockResolvedValue(Buffer.from('%PDF-'));
  await new ProductionOrderExportService(renderer).exportBatchReport({
    id: 1,
    item_code: 'BTP001',
    lot_no: '001',
    planned_quatity: 100,
    unit: 'Gói',
    item: { item_name: 'Sản phẩm thử' },
    semiFinishedProductGrossWeightChecks: checks,
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Semi-finished gross weight checks batch report', () => {
  it('prints recorded values, Vietnam check time, and escaped user text', () => {
    const html = buildSemiFinishedGrossWeightChecksHtml([check], metadata);
    expect(html).toContain('1,85 – 2,15 g');
    expect(html).toContain('1: 2,015 g');
    expect(html).toContain('2: 1,98 g');
    expect(html).toContain('3: —');
    expect(html).toContain('10: 2,05 g');
    expect(html).toContain('Kiểm tra &lt;khối lượng cả bì&gt; &amp; lưu kết quả');
    expect(html).toContain('08:30');
    expect(html).toContain('13/09/2026');
    expect(html).toContain('Gói cốm');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('preserves zero and missing bounds without inferring limits from requirement text', () => {
    const html = buildSemiFinishedGrossWeightChecksHtml(
      [{ ...check, lower_limit: new Prisma.Decimal(0), upper_limit: null }],
      metadata,
    );
    expect(html).toContain('0,00 – — g');
    const missing = buildSemiFinishedGrossWeightChecksHtml(
      [{ ...check, lower_limit: null, upper_limit: null }],
      metadata,
    );
    expect(missing).toContain('Chưa có');
  });

  it('includes a dedicated empty page when no checks exist', async () => {
    const html = await reportHtml([]);
    expect(html).toContain('Chưa có dữ liệu kiểm tra khối lượng cả bì.');
    expect(
      html.indexOf('class="report-page page-break semi-finished-gross-weight-check-page"'),
    ).toBeGreaterThan(html.indexOf('Kiểm tra khối lượng tịnh'));
  });

  it('includes every recorded row and creator fallback in export HTML', async () => {
    const html = await reportHtml([
      { ...check, createdBy: { username: 'operator' } },
    ]);
    expect(html).toContain('>operator</td>');
    expect(html).toContain('Khoảng kiểm soát');
    expect(html).toContain('Khối lượng đơn vị 1–10');
  });
});

const describeBrowser =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describeBrowser('Gross weight report pagination in Chromium', () => {
  it('keeps all rows above repeated footers and emits one PDF page per section', async () => {
    const checks = Array.from({ length: 90 }, (_, i) => ({
      ...check,
      requirement:
        `Kiểm tra ${i + 1} ` +
        'Khối lượng kiểm soát 1,850 – 2,150 g\n'.repeat((i % 5) + 1),
      createdBy: { name: 'Nguyễn Văn Kiểm Tra '.repeat((i % 4) + 1) },
    }));
    const fullHtml = await reportHtml(checks);
    const styles = fullHtml
      .match(/<style>([\s\S]*?)<\/style>/)![1]
      .replace(/@import[^;]+;/g, '');
    const section = fullHtml.slice(
      fullHtml.indexOf(
        '<main class="report-page page-break semi-finished-gross-weight-check-page"',
      ),
      fullHtml.indexOf(
        '</main>',
        fullHtml.indexOf(
          '<main class="report-page page-break semi-finished-gross-weight-check-page"',
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
          document.querySelectorAll('.semi-finished-gross-weight-check-page'),
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
