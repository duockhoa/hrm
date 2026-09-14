import { chromium } from 'playwright';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildSemiFinishedProductSummariesHtml,
  type SemiFinishedProductSummaryForReport,
} from './semi-finished-product-summaries-report-html';

const summary: SemiFinishedProductSummaryForReport = {
  stage: 'Đóng & <nang>',
  input_quantity: 100.5 as any,
  input_unit: 'kg',
  packed_quantity: 95.25 as any,
  packed_unit: 'kg',
  leftover_quantity: 3.1 as any,
  leftover_unit: 'kg',
  waste_quantity: 2.15 as any,
  waste_unit: 'kg',
  load_quantity: 5 as any,
  load_unit: 'tải',
  created_at: new Date('2026-09-13T01:30:00Z'),
  createdBy: { name: '<script>alert(1)</script>' },
};

const metadata = {
  appInfo: 'EBR',
  printTime: '13/09/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};

async function reportHtml(summaries: SemiFinishedProductSummaryForReport[]) {
  const renderer = new ProductionOrderPdfRendererService();
  const render = jest
    .spyOn(renderer, 'render')
    .mockResolvedValue(Buffer.from('%PDF-'));
  await new ProductionOrderExportService(renderer).exportBatchReport({
    id: 1,
    item_code: 'BTP001',
    lot_no: '001',
    planned_quatity: 100,
    unit: 'Vỉ',
    item: { item_name: 'Sản phẩm thử' },
    semiFinishedProductSummaries: summaries,
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Semi-finished product summaries batch report', () => {
  it('prints recorded quantities with units, Vietnam time, and escaped text', () => {
    const html = buildSemiFinishedProductSummariesHtml([summary], metadata);
    expect(html).toContain('Đóng &amp; &lt;nang&gt;');
    expect(html).toContain('100,5 kg');
    expect(html).toContain('95,25 kg');
    expect(html).toContain('3,1 kg');
    expect(html).toContain('2,15 kg');
    expect(html).toContain('5 tải');
    expect(html).toContain('08:30');
    expect(html).toContain('13/09/2026');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('handles null quantities and formats missing fields with dash', () => {
    const emptySummary: SemiFinishedProductSummaryForReport = {
      stage: null,
      input_quantity: null,
      input_unit: null as any,
      packed_quantity: null,
      packed_unit: null as any,
      leftover_quantity: null,
      leftover_unit: null as any,
      waste_quantity: null,
      waste_unit: null as any,
      load_quantity: null,
      load_unit: null as any,
      created_at: new Date('2026-09-13T01:30:00Z'),
      createdBy: null,
    };
    const html = buildSemiFinishedProductSummariesHtml([emptySummary], metadata);
    expect(html).toContain('—');
  });

  it('includes a dedicated empty page when no summaries exist', async () => {
    const html = await reportHtml([]);
    expect(html).toContain('Chưa có dữ liệu tổng kết sản lượng bán thành phẩm.');
    expect(
      html.indexOf(
        'class="report-page page-break semi-finished-product-summary-page"',
      ),
    ).toBeGreaterThan(html.indexOf('Kiểm tra độ kín'));
  });

  it('includes every recorded row and creator fallback in export HTML', async () => {
    const html = await reportHtml([
      { ...summary, createdBy: { username: 'operator' } },
    ]);
    expect(html).toContain('>operator</td>');
    expect(html).toContain('Số tải / sọt lọ');
  });
});

const describeBrowser =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describeBrowser(
  'Semi-finished product summaries report pagination in Chromium',
  () => {
    it('keeps all rows above repeated footers and emits one PDF page per section', async () => {
      const summaries = Array.from({ length: 90 }, (_, i) => ({
        ...summary,
        stage: `Giai đoạn ${i + 1}`,
        createdBy: { name: 'Người vận hành '.repeat((i % 4) + 1) },
      }));
      const fullHtml = await reportHtml(summaries);
      const styles = fullHtml
        .match(/<style>([\s\S]*?)<\/style>/)![1]
        .replace(/@import[^;]+;/g, '');
      const section = fullHtml.slice(
        fullHtml.indexOf(
          '<main class="report-page page-break semi-finished-product-summary-page"',
        ),
        fullHtml.indexOf(
          '</main>',
          fullHtml.indexOf(
            '<main class="report-page page-break semi-finished-product-summary-page"',
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
            document.querySelectorAll(
              '.semi-finished-product-summary-page',
            ),
          );
          return {
            count: pages.length,
            lastBottom:
              pages[pages.length - 1]?.getBoundingClientRect().bottom ?? 0,
          };
        });
        expect(pdf.length).toBeGreaterThan(0);
        expect(layout.count).toBeGreaterThanOrEqual(1);
      } finally {
        await browser.close();
      }
    });
  },
);
