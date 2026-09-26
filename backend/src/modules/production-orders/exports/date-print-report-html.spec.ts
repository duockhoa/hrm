import { renderDatePrintHtml } from './date-print-report-html';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import { chromium } from 'playwright';
import * as imageFiles from '../../items/date-print-template-image-upload.config';
import path from 'node:path';

const order = {
  id: 12,
  item_code: 'BTP00467',
  item: { item_name: 'BTP Thuốc xịt mũi Wizosone 120 liều' },
  lot_no: '1021026',
  date_manufacture: '2026-10-02',
  expire_date: '2028-10-02',
} as Parameters<typeof renderDatePrintHtml>[0];
const template = {
  version: 1,
  print_content:
    'NSX: {{mfg_dd}}{{mfg_mm}}{{mfg_yy}}\nHSD: {{exp_dd}}{{exp_mm}}{{exp_yy}}\nLSX: {{batch_number}}',
  print_position: 'In giữa gói',
  image_path: null,
} as Parameters<typeof renderDatePrintHtml>[1];

describe('date print PDF template', () => {
  it('escapes optional notes and places them before the print position', async () => {
    const html = await renderDatePrintHtml(order, template, '<b>Kiểm tra</b>\nDòng 2');
    expect(html).toContain('&lt;b&gt;Kiểm tra&lt;/b&gt;\nDòng 2');
    expect(html.indexOf('<p class="note')).toBeLessThan(html.indexOf('<p class="position'));
    const pdf = await new ProductionOrderPdfRendererService().render(html);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 60000);
  it('embeds the illustration instead of loading an authenticated URL in Chromium', async () => {
    const spy = jest.spyOn(imageFiles, 'resolveDatePrintTemplateImageFile').mockResolvedValue({ filePath: path.join(process.cwd(), 'templates/batch-report/logo.png'), contentType: 'image/png' });
    try {
      const html = await renderDatePrintHtml(order, { ...template, image_path: '/items/date-print-templates/images/example.png' });
      expect(html).toContain('<div class="illustration"><img src="data:image/png;base64,');
      expect(html).not.toContain('/items/date-print-templates/images/example.png');
    } finally { spy.mockRestore(); }
  });

  it('rejects overflowing content instead of overlapping the footer', async () => {
    const html = await renderDatePrintHtml(order, { ...template, print_content: 'Nội dung in\n'.repeat(100) });
    await expect(new ProductionOrderPdfRendererService().render(html)).rejects.toThrow('quá dài');
  }, 60000);
  it('shares Word values, escapes text and embeds the original logo', async () => {
    const html = await renderDatePrintHtml(
      { ...order, item: { item_name: '<script>alert(1)</script>' } },
      template,
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('NSX: 021026\nHSD: 021028\nLSX: 1021026');
    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toContain('{{');
  });

  it('renders a real PDF and keeps the illustration above the footer', async () => {
    const html = await renderDatePrintHtml(order, template);
    const pdf = await new ProductionOrderPdfRendererService().render(html);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ media: 'print' });
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      const fits = await page.evaluate(
        () =>
          document.querySelector('.illustration')!.getBoundingClientRect()
            .bottom <
          document.querySelector('.report-page')!.getBoundingClientRect()
            .bottom -
            50,
      );
      expect(fits).toBe(true);
    } finally {
      await browser.close();
    }
  }, 60000);
});
