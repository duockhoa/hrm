import { Prisma } from '@prisma/client';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildPostHomogenizationGranuleChecksHtml,
  type PostHomogenizationGranuleCheckForReport,
} from './post-homogenization-granule-checks-report-html';

const check: PostHomogenizationGranuleCheckForReport = {
  bulk_density: new Prisma.Decimal('0.625125'),
  tapped_density: new Prisma.Decimal('0.7525'),
  density_unit: 'g/ml',
  carr_index: new Prisma.Decimal('16.9269'),
  moisture_percent: new Prisma.Decimal('4.25'),
  created_at: new Date('2026-09-13T01:30:00Z'),
  createdBy: { name: '<script>alert(1)</script>' },
};

const metadata = {
  appInfo: 'EBR',
  printTime: '13/09/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};

async function reportHtml(checks: PostHomogenizationGranuleCheckForReport[]) {
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
    postHomogenizationGranuleChecks: checks,
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Post-homogenization granule checks batch report', () => {
  it('prints the recorded granule quality values and escapes creator text', () => {
    const html = buildPostHomogenizationGranuleChecksHtml([check], metadata);

    expect(html).toContain('0,625125 g/ml');
    expect(html).toContain('0,7525 g/ml');
    expect(html).toContain('16,9269%');
    expect(html).toContain('4,25%');
    expect(html).toContain('08:30');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('adds an empty granule-check page after disinfectant preparations', async () => {
    const html = await reportHtml([]);

    expect(html).toContain('Chưa có dữ liệu kiểm tra cốm sau đồng nhất.');
    expect(
      html.indexOf(
        'class="report-page page-break post-homogenization-granule-check-page"',
      ),
    ).toBeGreaterThan(html.indexOf('Pha chế chất sát khuẩn'));
  });

  it('uses username when the creator name is unavailable', async () => {
    const html = await reportHtml([{ ...check, createdBy: { username: 'operator' } }]);

    expect(html).toContain('>operator</td>');
    expect(html).toContain('Khối lượng riêng thô');
  });
});
