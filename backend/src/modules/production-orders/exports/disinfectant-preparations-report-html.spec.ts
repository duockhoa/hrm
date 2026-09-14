import { Prisma } from '@prisma/client';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildDisinfectantPreparationsHtml,
  type DisinfectantPreparationForReport,
} from './disinfectant-preparations-report-html';

const preparation: DisinfectantPreparationForReport = {
  disinfectant_name: 'Cồn 70',
  purpose: 'Sát khuẩn dụng cụ',
  base_material_name: 'Cồn 96',
  base_material_content: new Prisma.Decimal('96'),
  base_material_amount_l: new Prisma.Decimal('7.3'),
  prepared_volume_l: new Prisma.Decimal('10'),
  actual_concentration: new Prisma.Decimal('70'),
  created_at: new Date('2026-09-13T01:30:00Z'),
  workshop: { code: 'SX01', name: 'Xưởng sản xuất 1' },
  createdBy: { name: '<script>alert(1)</script>' },
};

const metadata = {
  appInfo: 'EBR',
  printTime: '13/09/2026',
  printerName: 'Người in',
  watermarkDataUri: '',
};

async function reportHtml(
  preparations: DisinfectantPreparationForReport[],
) {
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
    disinfectantPreparations: preparations,
  } as Parameters<ProductionOrderExportService['exportBatchReport']>[0]);
  return render.mock.calls[0][0];
}

describe('Disinfectant preparations batch report', () => {
  it('prints preparation details and escapes creator text', () => {
    const html = buildDisinfectantPreparationsHtml([preparation], metadata);

    expect(html).toContain('SX01 - Xưởng sản xuất 1');
    expect(html).toContain('Cồn 70');
    expect(html).toContain('Hàm lượng: 96%');
    expect(html).toContain('7,3 L');
    expect(html).toContain('08:30');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('adds an empty disinfectant-preparation page after shell weights', async () => {
    const html = await reportHtml([]);

    expect(html).toContain('Chưa có dữ liệu pha chế chất sát khuẩn.');
    expect(
      html.indexOf('class="report-page page-break disinfectant-preparation-page"'),
    ).toBeGreaterThan(html.indexOf('Kiểm tra khối lượng vỏ'));
  });

  it('uses username when the creator name is unavailable', async () => {
    const html = await reportHtml([
      { ...preparation, createdBy: { username: 'operator' } },
    ]);

    expect(html).toContain('>operator</td>');
    expect(html).toContain('Nồng độ thực tế');
  });
});
