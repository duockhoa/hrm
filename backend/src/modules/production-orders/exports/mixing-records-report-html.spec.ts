import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import type { MixingRecordForReport } from './mixing-records-report-html';

type Order = Parameters<ProductionOrderExportService['exportBatchReport']>[0];
const timestamp = new Date('2026-09-17T01:30:00Z');
const record = (id = 1, count = 3) =>
  ({
    id,
    record_type: 'mixing',
    template_version: '3',
    description: 'Theo dõi <pha chế> & kiểm tra',
    created_at: timestamp,
    createdBy: { name: 'Người tạo' },
    qa_staff_approved_at: timestamp,
    qaStaffApprovedBy: { name: 'Người ĐBCL' },
    ipc_staff_approved_at: null,
    ipcStaffApprovedBy: null,
    stages: [
      {
        id: id * 100,
        stage_order: 1,
        stage_name: 'Chuẩn bị',
        steps: [
          {
            id: id * 1000,
            step_order: 1,
            step_name: 'Kiểm tra thiết bị',
            parameters: Array.from({ length: count }, (_, index) => ({
              id: id * 10000 + index,
              parameter_order: index + 1,
              parameter_name: `Thông số ${index}`,
              requirement: 'Yêu cầu <đúng>\nDòng hai',
              data_type: index === 1 ? 'boolean' : 'decimal',
              result_value: index === 1 ? 'false' : '0',
              unit: index === 1 ? null : 'kg',
              note: '<script>không chạy</script>',
              result_image_path: null,
              recordedBy: { username: 'operator' },
              recorded_at: timestamp,
            })),
          },
          {
            id: id * 1000 + 1,
            step_order: 2,
            step_name: 'Bước chưa có thông số',
            parameters: [],
          },
        ],
      },
    ],
  }) as unknown as MixingRecordForReport;

async function htmlFor(
  records: MixingRecordForReport[],
  featureConfig: Order['featureConfig'] = {
    actions: [{ key: 'view_mixing_record', enabled: true }],
    sections: [
      { key: 'production_order_lines', enabled: true },
      { key: 'production_order_deviations', enabled: true },
    ],
  },
) {
  const renderer = new ProductionOrderPdfRendererService();
  const render = jest
    .spyOn(renderer, 'render')
    .mockResolvedValue(Buffer.from('%PDF-'));
  await new ProductionOrderExportService(renderer).exportBatchReport({
    id: 1,
    item_code: 'BTP001',
    item: { item_name: 'Sản phẩm thử' },
    description: 'Sản phẩm thử',
    lot_no: 'LOT-001',
    planned_quatity: 1000,
    unit: 'Lọ',
    mixingRecords: records,
    featureConfig,
  } as Order);
  return render.mock.calls[0][0];
}

describe('Mixing record report form', () => {
  afterEach(() => jest.restoreAllMocks());
  it('prints the complete saved form after warehouse release and before deviations', async () => {
    const html = await htmlFor([record()]);
    expect(
      html.indexOf('data-action-key="view_mixing_record"'),
    ).toBeGreaterThan(html.indexOf('warehouse-release-page"'));
    expect(html.indexOf('data-action-key="view_mixing_record"')).toBeLessThan(
      html.indexOf('Thông tin sai lệch'),
    );
    for (const value of [
      'BMDB004.01',
      '23/08/2026',
      'Lần ban hành: 02',
      'Sản phẩm thử',
      '1.000',
      'LOT-001',
      'Yêu cầu',
      'Thực tế',
      'Ghi chú',
      'Hình ảnh',
      'Người thực hiện',
      'Thông số 0',
      'Yêu cầu &lt;đúng&gt;',
      '☑ Sai',
      'operator',
      '08:30',
      '&lt;script&gt;không chạy&lt;/script&gt;',
      'Bước chưa có thông số',
      'Nhân viên ĐBCL',
      'Người ĐBCL',
      'Nhân viên IPC',
      '☐ Chưa duyệt',
    ])
      expect(html).toContain(value);
    expect(html).not.toContain('<script>');
  });
  it.each([
    null,
    {},
    { actions: [{ key: 'view_mixing_record', enabled: false }] },
    { sections: [{ key: 'view_mixing_record', enabled: true }] },
  ])('requires the action to be enabled, config=%j', async (config) => {
    const html = await htmlFor([record()], config);
    expect(html).not.toContain('data-action-key="view_mixing_record"');
  });
  it('prints every record including alternate types and an explicit empty state', async () => {
    const second = {
      ...record(2),
      record_type: 'primary_packaging_processing',
      description: 'Phiếu thứ hai',
    };
    const html = await htmlFor([record(), second]);
    expect(html.match(/data-action-key="view_mixing_record"/g)).toHaveLength(2);
    expect(html).toContain('Phiếu xử lý bao bì cấp 1');
    expect(html).toContain('Phiếu thứ hai');
    expect(await htmlFor([])).toContain('Lệnh sản xuất chưa có phiếu pha chế.');
  });
  it('embeds result images without external image requests', async () => {
    const directory = path.join(process.cwd(), 'templates', 'batch-report');
    jest
      .spyOn(fs, 'realpath')
      .mockImplementation(async (file) =>
        String(file).endsWith('logo.png')
          ? path.join(directory, 'logo.png')
          : directory,
      );
    const input = record();
    input.stages[0].steps[0].parameters[0].result_image_path =
      '/production-orders/mixing-record-parameters/images/logo.png';
    const html = await htmlFor([input]);
    expect(html).toMatch(
      /class="mixing-image"><img src="data:image\/png;base64,/,
    );
    expect(html).not.toContain('Không thể hiển thị ảnh');
  });
});

const describePdf =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describePdf('Mixing record PDF pagination', () => {
  afterEach(() => jest.restoreAllMocks());
  it('preserves every parameter and approval across pages and merges step cells within each page', async () => {
    const html = await htmlFor([record(1, 60), record(2)]);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ javaScriptEnabled: false });
      jest.spyOn(chromium, 'launch').mockResolvedValue(browser);
      jest.spyOn(browser, 'newPage').mockResolvedValue(page);
      const pdf = page.pdf.bind(page);
      let layout:
        | {
            ids: string[];
            pages: number;
            approvals: number;
            merged: boolean;
            overflow: boolean;
          }
        | undefined;
      jest.spyOn(page, 'pdf').mockImplementation(async (options) => {
        layout = await page.evaluate(() => {
          const pages = Array.from(
            document.querySelectorAll('.mixing-record-page'),
          );
          return {
            ids: Array.from(
              document.querySelectorAll<HTMLElement>('[data-parameter-id]'),
            ).map((row) => row.dataset.parameterId!),
            pages: pages.length,
            approvals: document.querySelectorAll('.mixing-approvals').length,
            merged: Array.from(
              document.querySelectorAll<HTMLTableCellElement>(
                '[data-step-cell]',
              ),
            ).some((cell) => cell.rowSpan > 1),
            overflow: pages.some(
              (page) =>
                page.querySelector('.mixing-content')!.getBoundingClientRect()
                  .bottom >
                page.querySelector('.page-footer')!.getBoundingClientRect().top,
            ),
          };
        });
        return pdf(options);
      });
      const buffer = await new ProductionOrderPdfRendererService().render(html);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
      expect(layout?.ids).toEqual([
        ...Array.from({ length: 60 }, (_, i) => String(10000 + i)),
        ...Array.from({ length: 3 }, (_, i) => String(20000 + i)),
      ]);
      expect(layout?.pages).toBeGreaterThan(2);
      expect(layout?.approvals).toBe(2);
      expect(layout?.merged).toBe(true);
      expect(layout?.overflow).toBe(false);
    } finally {
      await browser.close();
    }
  }, 60000);
});
