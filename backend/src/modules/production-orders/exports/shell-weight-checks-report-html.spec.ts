import { Prisma } from '@prisma/client';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildShellWeightChecksHtml,
  type ShellWeightCheckForReport,
} from './shell-weight-checks-report-html';

const check: ShellWeightCheckForReport = {
  shell_1_weight: new Prisma.Decimal('10.25'),
  shell_2_weight: new Prisma.Decimal('10.5'),
  shell_3_weight: new Prisma.Decimal('10.75'),
  shell_4_weight: new Prisma.Decimal('11'),
  shell_5_weight: new Prisma.Decimal('11.25'),
  shell_6_weight: new Prisma.Decimal('11.5'),
  shell_7_weight: new Prisma.Decimal('11.75'),
  shell_8_weight: new Prisma.Decimal('12'),
  shell_9_weight: new Prisma.Decimal('12.25'),
  shell_10_weight: new Prisma.Decimal('12.5'),
  unit: 'mg',
  created_at: new Date('2026-09-13T01:30:00Z'),
  createdBy: { name: '<script>alert(1)</script>' },
};

const metadata = {
  appInfo: 'EBR',
  printTime: '13/09/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};

async function reportHtml(checks: ShellWeightCheckForReport[]) {
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
    shellWeightChecks: checks,
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Shell weight checks batch report', () => {
  it('prints all ten recorded shell weights and escapes creator text', () => {
    const html = buildShellWeightChecksHtml([check], metadata);

    expect(html).toContain('1: 10,25 mg');
    expect(html).toContain('10: 12,50 mg');
    expect(html).toContain('08:30');
    expect(html).toContain('13/09/2026');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('adds the section after existing batch-report sections, including when empty', async () => {
    const html = await reportHtml([]);

    expect(html).toContain('Chưa có dữ liệu kiểm tra khối lượng vỏ.');
    expect(
      html.indexOf('class="report-page page-break shell-weight-check-page"'),
    ).toBeGreaterThan(html.indexOf('Kiểm tra khối lượng cả bì'));
  });

  it('includes every recorded row and falls back to username', async () => {
    const html = await reportHtml([{ ...check, createdBy: { username: 'operator' } }]);

    expect(html).toContain('>operator</td>');
    expect(html).toContain('Khối lượng vỏ 1–10');
  });
});
