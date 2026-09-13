import { chromium } from 'playwright';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildHygieneChecksHtml,
  HygieneCheckForReport,
} from './hygiene-checks-report-html';

const check: HygieneCheckForReport = {
  room_or_equipment: 'Phòng cân <A> & B',
  cleaning_type: 'Đầu ca',
  result: 'Không đạt',
  note: 'Cần vệ sinh lại\nKiểm tra <lần 2>',
  created_at: new Date('2026-09-13T01:30:00Z'),
  createdBy: { name: '<script>alert(1)</script>' },
};
const metadata = {
  appInfo: 'EBR',
  printTime: '13/09/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};

async function reportHtml(checks: HygieneCheckForReport[]) {
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
    hygieneChecks: checks,
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Hygiene checks batch report', () => {
  it('prints recorded values, Vietnam check time, and escaped user text', () => {
    const html = buildHygieneChecksHtml([check], metadata);
    expect(html).toContain('Đầu ca');
    expect(html).toContain('Không đạt');
    expect(html).toContain('Cần vệ sinh lại\nKiểm tra &lt;lần 2&gt;');
    expect(html).toContain('08:30');
    expect(html).toContain('13/09/2026');
    expect(html).toContain('Phòng cân &lt;A&gt; &amp; B');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('includes a dedicated empty page when no checks exist', async () => {
    const html = await reportHtml([]);
    expect(html).toContain('Chưa có dữ liệu kiểm tra vệ sinh.');
    expect(
      html.indexOf('class="report-page page-break hygiene-check-page"'),
    ).toBeGreaterThan(html.indexOf('Theo dõi nhiệt độ, độ ẩm'));
  });

  it('includes every recorded row and creator fallback in export HTML', async () => {
    const html = await reportHtml([
      { ...check, createdBy: { username: 'operator' } },
    ]);
    expect(html).toContain('>operator</td>');
    expect(html).toContain('Phòng/thiết bị');
    expect(html).toContain('Ghi chú');
  });
});

const describeBrowser =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describeBrowser('Hygiene report pagination in Chromium', () => {
  it('keeps all rows above repeated footers and emits one PDF page per section', async () => {
    const checks = Array.from({ length: 90 }, (_, i) => ({
      ...check,
      room_or_equipment: `Phòng ${i + 1} ` + 'Khu vực sản xuất '.repeat(i % 5),
      createdBy: { name: 'Nguyễn Văn Kiểm Tra '.repeat((i % 4) + 1) },
    }));
    const fullHtml = await reportHtml(checks);
    // Isolate the new pages from pre-existing report sections for layout assertions.
    const styles = fullHtml
      .match(/<style>([\s\S]*?)<\/style>/)![1]
      .replace(/@import[^;]+;/g, '');
    const section = fullHtml.slice(
      fullHtml.indexOf(
        '<main class="report-page page-break hygiene-check-page"',
      ),
      fullHtml.indexOf('</main>', fullHtml.indexOf('<main class="report-page page-break hygiene-check-page"')) + '</main>'.length,
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
          document.querySelectorAll('.hygiene-check-page'),
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
