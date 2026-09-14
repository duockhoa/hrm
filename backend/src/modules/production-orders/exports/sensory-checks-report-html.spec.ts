import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildSensoryChecksHtml,
  type SensoryCheckForReport,
} from './sensory-checks-report-html';

const check: SensoryCheckForReport = {
  dosage_form_stage: 'granule_package',
  unit_1_result: true,
  unit_2_result: false,
  unit_3_result: true,
  unit_4_result: null,
  unit_5_result: null,
  unit_6_result: null,
  unit_7_result: null,
  unit_8_result: null,
  unit_9_result: null,
  unit_10_result: null,
  created_at: new Date('2026-09-13T01:30:00Z'),
  createdBy: { name: '<script>alert(1)</script>' },
};

const metadata = {
  appInfo: 'EBR',
  printTime: '13/09/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};

async function reportHtml(checks: SensoryCheckForReport[]) {
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
    tenUnitSensoryChecks: checks,
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Sensory checks batch report', () => {
  it('prints ten-unit sensory results and escaped creator text', () => {
    const html = buildSensoryChecksHtml([check], metadata);

    expect(html).toContain('Gói cốm');
    expect(html).toContain('>Đạt</td>');
    expect(html).toContain('>Không đạt</td>');
    expect(html).toContain('>—</td>');
    expect(html).toContain('08:30');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('adds an empty sensory-check page after granule checks', async () => {
    const html = await reportHtml([]);

    expect(html).toContain('Chưa có dữ liệu kiểm tra cảm quan sản phẩm.');
    expect(
      html.indexOf('class="report-page page-break sensory-check-page"'),
    ).toBeGreaterThan(html.indexOf('Kiểm tra cốm sau đồng nhất'));
  });

  it('uses username when the creator name is unavailable', async () => {
    const html = await reportHtml([{ ...check, createdBy: { username: 'operator' } }]);

    expect(html).toContain('>operator</td>');
    expect(html).toContain('Đơn vị 10');
  });
});
