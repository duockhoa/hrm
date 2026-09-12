import {
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import type { Browser } from 'playwright';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import { ProductionOrderExportService } from './production-order-export.service';

const exampleOrder = (itemCode: string, remarks = 'Thể tích pha chế: 1060 L') =>
  ({
    id: 1,
    item_code: itemCode,
    item: {
      item_name: 'Dung dịch EUCIGA 5 ml',
      registration: { registration_number: 'VD-12345-26' },
    },
    production_order_code: 'LSX/001/2026',
    lot_no: '0030126',
    planned_quatity: 10000,
    unit: 'Lọ',
    date_manufacture: '2026-01-26',
    expire_date: '2029-01-26',
    packing_specification: '5 ml/gói × 30 gói/hộp × 30 hộp/kiện',
    remarks,
  }) as Parameters<ProductionOrderExportService['exportBatchReport']>[0];

describe('Batch report HTML template', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['TP001', 'BTP001'])(
    'uses the semi-finished template for %s without changing its data',
    async (itemCode) => {
      const renderer = new ProductionOrderPdfRendererService();
      const render = jest
        .spyOn(renderer, 'render')
        .mockResolvedValue(Buffer.from('%PDF-1.7'));
      const exporter = new ProductionOrderExportService(renderer);
      const readFile = jest.spyOn(fs, 'readFile');
      await exporter.exportBatchReport(exampleOrder(itemCode));
      const html = render.mock.calls[0][0];
      const header = html.replace(/<[^>]+>/g, '');
      const body = header;
      expect(
        readFile.mock.calls.every(
          ([file]) => typeof file === 'string' && !file.endsWith('.docx'),
        ),
      ).toBe(true);
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('data:image/png;base64,');
      expect(header).toContain('(Lệnh pha chế)');
      expect(header).not.toContain('Lệnh hoàn thiện');
      expect(body).toContain('Ngày pha chế:');
      expect(body).toContain('PGĐ Sản xuất');
      expect(body).toContain('Phạm Văn Giang');
      expect(body).toContain(itemCode);
      expect(body).toContain('10.000 lọ');
    },
  );
});

describe('Batch report HTML escaping', () => {
  it('escapes notes without executing markup or substituting nested placeholders', async () => {
    const renderer = new ProductionOrderPdfRendererService();
    const render = jest
      .spyOn(renderer, 'render')
      .mockResolvedValue(Buffer.from('%PDF-1.7'));
    const exporter = new ProductionOrderExportService(renderer);
    await exporter.exportBatchReport(
      exampleOrder(
        'TP001',
        '<script>alert("x")</script> & {{lot_no}}\nDòng thứ hai',
      ),
    );
    const html = render.mock.calls[0][0];
    expect(html).toContain(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; {{lot_no}}\nDòng thứ hai',
    );
    expect(html).not.toContain('<script>');
  });
});

describe('ProductionOrderPdfRendererService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('releases its slot after Chromium fails to start', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const launch = jest
      .spyOn(chromium, 'launch')
      .mockRejectedValue(new Error('missing browser'));
    const renderer = new ProductionOrderPdfRendererService();
    await expect(renderer.render('<html></html>')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(renderer.render('<html></html>')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it('rejects concurrent exports without launching a second browser', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    let rejectLaunch!: (reason: Error) => void;
    const launch = jest.spyOn(chromium, 'launch').mockImplementation(
      () =>
        new Promise<Browser>((_, reject) => {
          rejectLaunch = reject;
        }),
    );
    const renderer = new ProductionOrderPdfRendererService();
    const first = renderer.render('<html>first</html>');
    const failed = expect(first).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(renderer.render('<html>second</html>')).rejects.toThrow(
      'Đang xuất báo cáo khác',
    );
    expect(launch).toHaveBeenCalledTimes(1);
    rejectLaunch(new Error('launch failed'));
    await failed;
  });
});

// Explicitly enabled on a host/image with the matching Chromium installation.
const describePdf =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describePdf('Production order PDF rendering with Chromium', () => {
  it.each(['TP001', 'BTP001'])(
    'renders %s as exactly one PDF page',
    async (itemCode) => {
      const exporter = new ProductionOrderExportService(
        new ProductionOrderPdfRendererService(),
      );
      const file = await exporter.exportBatchReport(exampleOrder(itemCode));
      expect(file.contentType).toBe('application/pdf');
      expect(file.buffer.subarray(0, 5).toString()).toBe('%PDF-');
      // Chromium emits an uncompressed page tree, distinct from /Type /Pages.
      expect(
        file.buffer.toString('latin1').match(/\/Type\s*\/Page\b/g),
      ).toHaveLength(1);
      expect(file.filename).toBe(
        'Bao cao lo san xuat Dung dịch EUCIGA 5 ml 0030126.pdf',
      );
    },
    45_000,
  );

  it('rejects overflowing notes and can export again afterwards', async () => {
    const exporter = new ProductionOrderExportService(
      new ProductionOrderPdfRendererService(),
    );
    await expect(
      exporter.exportBatchReport(
        exampleOrder('TP001', 'Ghi chú rất dài\n'.repeat(200)),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      exporter.exportBatchReport(exampleOrder('TP001')),
    ).resolves.toEqual(
      expect.objectContaining({ contentType: 'application/pdf' }),
    );
  }, 60_000);

  it('keeps user HTML as document text', async () => {
    const exporter = new ProductionOrderExportService(
      new ProductionOrderPdfRendererService(),
    );
    await expect(
      exporter.exportBatchReport(
        exampleOrder(
          'TP001',
          '<script>throw new Error("injected")</script> & <img src="http://127.0.0.1/private">',
        ),
      ),
    ).resolves.toEqual(
      expect.objectContaining({ contentType: 'application/pdf' }),
    );
  }, 45_000);
});
