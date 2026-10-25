import fs from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { chromium } from 'playwright';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import {
  buildWeighingRecordsHtml,
  type WeighingRecordForReport,
} from './weighing-records-report-html';

type Order = Parameters<ProductionOrderExportService['exportBatchReport']>[0];
const at = new Date('2026-10-25T14:00:00Z');
const decimal = (value: string) => new Prisma.Decimal(value);
const record = (id = 1, count = 4) =>
  ({
    id,
    description: 'Cân nguyên liệu <kiểm tra> & đối chiếu',
    created_at: at,
    createdBy: { name: 'Người tạo' },
    qa_staff_approved_at: at,
    qaStaffApprovedBy: { name: 'Nguyễn Thị QA' },
    ipc_staff_approved_at: null,
    ipcStaffApprovedBy: null,
    lines: Array.from({ length: count }, (_, i) => ({
      id: id * 1000 + i,
      item_code: `NL${String(Math.floor(i / 2)).padStart(4, '0')}`,
      item_name:
        i % 2
          ? 'Nguyên liệu có tên dài để kiểm tra xuống dòng'
          : 'Nguyên liệu thử',
      lot_no: `250423010061-${i + 1}`,
      planned_quantity: decimal('130'),
      unit: 'Gam',
      note: i === 0 ? 'Ghi chú dòng\nDòng thứ hai' : null,
      lotCheck:
        i % 3 === 0
          ? { is_correct: true }
          : i % 3 === 1
            ? { is_correct: false }
            : null,
      details: [
        {
          id: i * 10,
          net_weight: decimal('130.1'),
          unit: 'Gam',
          note: 'Ghi chú cân',
          weighedBy: { name: 'Lê Hoàng Cường' },
        },
        {
          id: i * 10 + 1,
          net_weight: decimal('-0.1'),
          unit: 'Gam',
          note: null,
          weighedBy: { username: 'operator' },
        },
      ],
    })),
  }) as unknown as WeighingRecordForReport;

async function htmlFor(
  records: WeighingRecordForReport[],
  featureConfig: Order['featureConfig'] = {
    actions: [
      { key: 'view_mixing_record', enabled: true },
      { key: 'view_weighing_record', enabled: true },
    ],
    sections: [{ key: 'production_order_deviations', enabled: true }],
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
    weighingRecords: records,
    mixingRecords: [],
    featureConfig,
  } as Order);
  return render.mock.calls[0][0];
}

describe('Weighing record report', () => {
  afterEach(() => jest.restoreAllMocks());
  it('includes each saved form immediately after mixing and before deviations', async () => {
    const html = await htmlFor([record(), record(2)]);
    expect(
      html.indexOf('data-action-key="view_weighing_record"'),
    ).toBeGreaterThan(html.indexOf('data-action-key="view_mixing_record"'));
    expect(html.indexOf('data-action-key="view_weighing_record"')).toBeLessThan(
      html.indexOf('Thông tin sai lệch'),
    );
    expect(html.match(/data-action-key="view_weighing_record"/g)).toHaveLength(
      2,
    );
    for (const label of [
      'BMDB005.01',
      '24/10/2026',
      'Lần ban hành: 02',
      'Tổng lượng YC',
      'Tổng lượng TT',
      'Tổng khối lượng',
      'ĐVT',
      '260',
      '130,1 + -0,1',
      'Người cân:',
      'Lê Hoàng Cường, operator',
      'Nhân viên ĐBCL',
      'Nhân viên IPC',
      'Nguyễn Thị QA',
      '21:00:00',
      'weighing-lot-correct',
      'weighing-lot-incorrect',
      'weighing-status-within',
    ])
      expect(html).toContain(label);
    expect(html).toContain('&lt;kiểm tra&gt; &amp; đối chiếu');
    expect(html).not.toContain('checked_by_id');
    expect(html).not.toContain('<button');
  });
  it('supports the independent weighing section without requiring the mixing action', async () => {
    const html = await htmlFor([record()], {
      sections: [{ key: 'weighing_records', enabled: true }],
    });
    expect(html).toContain('data-action-key="view_weighing_record"');
    expect(html).not.toContain('data-action-key="view_mixing_record"');
  });
  it.each([
    null,
    {},
    { actions: [{ key: 'view_weighing_record', enabled: false }] },
  ])('does not export a disabled feature %j', async (config) => {
    expect(await htmlFor([record()], config)).not.toContain(
      'data-action-key="view_weighing_record"',
    );
  });
  it('renders empty records and empty material lists', async () => {
    expect(await htmlFor([])).toContain('Lệnh sản xuất chưa có phiếu cân.');
    expect(await htmlFor([record(1, 0)])).toContain(
      'Chưa có nguyên liệu trong phiếu cân.',
    );
  });
  it('matches frontend decimal boundaries, signed values and separate units', () => {
    const input = record(1, 1);
    const line = input.lines[0];
    const make = (required: string, actual: string) => {
      line.planned_quantity = decimal(required);
      line.details = [{ ...line.details[0], net_weight: decimal(actual) }];
      return buildWeighingRecordsHtml(
        [input],
        {
          item_code: 'BTP',
          description: '',
          lot_no: '',
          planned_quatity: 1,
          unit: 'Lọ',
        },
        {
          appInfo: '',
          printTime: '',
          printerName: '',
          watermarkDataUri: '',
          logoDataUri: '',
        },
      );
    };
    for (const [required, tolerance] of [
      ['100000', '200'],
      ['10000', '100'],
      ['4000', '50'],
      ['10', '0.1'],
      ['1', '0.02'],
    ]) {
      const lower = decimal(required).minus(tolerance);
      const upper = decimal(required).plus(tolerance);
      expect(make(required, lower.toFixed())).toContain(
        'weighing-status-within',
      );
      expect(make(required, upper.toFixed())).toContain(
        'weighing-status-within',
      );
      expect(make(required, lower.minus('0.000001').toFixed())).toContain(
        'weighing-status-below',
      );
      expect(make(required, upper.plus('0.000001').toFixed())).toContain(
        'weighing-status-above',
      );
    }
    expect(make('1', '-0.000001')).toContain('-0,000001');
    line.details.push({
      ...line.details[0],
      id: 90,
      unit: 'kg',
      net_weight: decimal('0.2'),
    });
    const html = buildWeighingRecordsHtml(
      [input],
      {
        item_code: 'BTP',
        description: '',
        lot_no: '',
        planned_quatity: 1,
        unit: 'Lọ',
      },
      {
        appInfo: '',
        printTime: '',
        printerName: '',
        watermarkDataUri: '',
        logoDataUri: '',
      },
    );
    expect(html).toContain('0,2 kg');
    expect(html.match(/class="weighing-status /g)).toHaveLength(1);
  });
});

const describePdf =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describePdf('Weighing record PDF pagination', () => {
  afterEach(() => jest.restoreAllMocks());
  it('preserves material rows, merged totals, notes and approvals without footer overlap', async () => {
    const input = record(1, 50);
    // One material spans several pages; totals must be repeated and merged per page.
    input.lines.forEach((line, i) => {
      if (i < 30) line.item_code = 'NL0000';
    });
    const html = await htmlFor([input, record(2)]);
    jest.restoreAllMocks();
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PDF_BROWSER_EXECUTABLE || undefined,
    });
    try {
      const page = await browser.newPage({ javaScriptEnabled: false });
      jest.spyOn(chromium, 'launch').mockResolvedValue(browser);
      jest.spyOn(browser, 'newPage').mockResolvedValue(page);
      const originalPdf = page.pdf.bind(page);
      jest.spyOn(page, 'pdf').mockImplementation(async (options) => {
        const layout = await page.evaluate(() => {
          const pages = Array.from(
            document.querySelectorAll<HTMLElement>('.weighing-record-page'),
          );
          return {
            pages: pages.length,
            ids: Array.from(
              document.querySelectorAll<HTMLElement>('[data-weighing-line-id]'),
            ).map((row) => row.dataset.weighingLineId),
            approvals: document.querySelectorAll('.weighing-approvals').length,
            info: document.querySelectorAll('.weighing-info').length,
            merged: Array.from(
              document.querySelectorAll<HTMLTableCellElement>(
                '[data-weighing-total]',
              ),
            ).some((cell) => cell.rowSpan > 1),
            overflow: pages.some(
              (sheet) =>
                sheet
                  .querySelector('.weighing-content')!
                  .getBoundingClientRect().bottom >
                sheet.querySelector('.page-footer')!.getBoundingClientRect()
                  .top,
            ),
            crossPageSpan: Array.from(
              document.querySelectorAll<HTMLTableCellElement>(
                '[data-weighing-total]',
              ),
            ).some(
              (cell) =>
                cell.parentElement!.parentElement!.children.length <
                cell.rowSpan,
            ),
          };
        });
        expect(layout.ids).toEqual(
          [...input.lines, ...record(2).lines].map((line) => String(line.id)),
        );
        expect(layout.pages).toBeGreaterThan(3);
        expect(layout.approvals).toBe(2);
        expect(layout.info).toBe(2);
        expect(layout.merged).toBe(true);
        expect(layout.overflow).toBe(false);
        expect(layout.crossPageSpan).toBe(false);
        if (process.env.PDF_QA_DIR) {
          await fs.mkdir(process.env.PDF_QA_DIR, { recursive: true });
          await fs.writeFile(
            path.join(process.env.PDF_QA_DIR, 'weighing-report.html'),
            html,
          );
          const sheets = await page.locator('.weighing-record-page').all();
          for (let i = 0; i < sheets.length; i++)
            await sheets[i].screenshot({
              path: path.join(
                process.env.PDF_QA_DIR,
                `weighing-page-${i + 1}.png`,
              ),
            });
        }
        return originalPdf(options);
      });
      const buffer = await new ProductionOrderPdfRendererService().render(html);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
      if (process.env.PDF_QA_DIR)
        await fs.writeFile(
          path.join(process.env.PDF_QA_DIR, 'weighing-report.pdf'),
          buffer,
        );
    } finally {
      await browser.close();
    }
  }, 90_000);
});
