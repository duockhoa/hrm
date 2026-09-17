import { Prisma } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ProductionOrderExportService } from './production-order-export.service';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import { imageRow } from './report-section-layout';

const keys = [
  'secondary_packaging_checks',
  'pre_secondary_packaging_checks',
  'post_preparation_solution_checks',
  'friability_checks',
  'cylinder_calibration',
  'ten_shell_weight_check',
  'date_checks',
  'production_order_attachments',
  'finished_product_summary',
  'material_process_summaries',
  'factory_release_reviews',
  'primary_packaging_confirmations',
  'material_summaries',
];
type Order = Parameters<ProductionOrderExportService['exportBatchReport']>[0];
const baseOrder = {
  id: 1,
  item_code: 'BTP001',
  lot_no: '001',
  planned_quatity: 100,
  unit: 'Lọ',
  item: { item_name: 'Sản phẩm thử' },
};
async function htmlFor(
  sections: { key: string; enabled: boolean }[],
  data = {},
) {
  const renderer = new ProductionOrderPdfRendererService();
  const render = jest
    .spyOn(renderer, 'render')
    .mockResolvedValue(Buffer.from('%PDF-'));
  await new ProductionOrderExportService(renderer).exportBatchReport({
    ...baseOrder,
    ...data,
    featureConfig: { sections },
  } as Order);
  return render.mock.calls[0][0];
}
describe('Additional report sections', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(keys)(
    'exports only the enabled section %s, including its empty state',
    async (key) => {
      const html = await htmlFor(
        keys.map((candidate) => ({
          key: candidate,
          enabled: candidate === key,
        })),
      );
      expect(html).toContain('data-section-key="' + key + '"');
      expect(html).toContain('Chưa có dữ liệu.');
      for (const other of keys.filter((candidate) => candidate !== key)) {
        expect(html).not.toContain('data-section-key="' + other + '"');
      }
      expect(html).not.toMatch(/\{\{\w+\}\}/);
    },
  );
  it('omits all new sections when config is empty', async () => {
    const html = await htmlFor([]);
    expect(html).not.toContain('additional-report-page" data-section-key');
  });
  it('prints decimal zero, single-record relations, translated booleans, escaped text and derived totals', async () => {
    const record = {
      created_at: new Date('2026-09-17T01:30:00Z'),
      createdBy: { username: 'operator' },
    };
    const html = await htmlFor(
      keys.map((key) => ({ key, enabled: true })),
      {
        secondaryPackagingChecks: [
          {
            ...record,
            stage: 'Đóng hộp',
            requirement: 'Nhãn rõ',
            quantity_checked: 10,
            quantity_passed: 9,
            checkedBy: { name: 'Người kiểm tra' },
          },
        ],
        preSecondaryPackagingChecks: [
          {
            ...record,
            requirement: 'Bao bì nguyên vẹn',
            quantity_checked: 5,
            quantity_passed: 5,
          },
        ],
        postPreparationSolutionChecks: [
          {
            ...record,
            solution_color: 'Không màu',
            solution_clarity: 'Trong',
            solution_ph_1: new Prisma.Decimal('7.12'),
          },
        ],
        friabilityChecks: [
          {
            ...record,
            total_weight_before_check: new Prisma.Decimal('100'),
            total_weight_after_check: new Prisma.Decimal('99.9'),
            weight_unit: 'mg',
            friability_percent: new Prisma.Decimal('0.1'),
          },
        ],
        dateChecks: [
          {
            ...record,
            package_type: 'ong_be',
            checked_at: record.created_at,
            approval_status: 'approved',
            approvedBy: { name: 'Người phê duyệt' },
          },
        ],
        attachments: [
          {
            ...record,
            attachment_type: 'quality_check',
            description: 'Ảnh kiểm nghiệm',
            requires_approval: true,
            approval_status: 'pending',
            entered_at: record.created_at,
            enteredBy: record.createdBy,
            files: [],
          },
        ],
        materialProcessSummaries: [
          {
            ...record,
            process_stage: 'Chiết xuất',
            yielded_quantity: new Prisma.Decimal('12.345'),
            yielded_unit: 'kg',
            moisture_percent: new Prisma.Decimal('0'),
          },
        ],
        factoryReleaseReviews: [
          {
            ...record,
            registration_number: 'VD-123',
            raw_material_test_result: 'Nguyên liệu đạt',
            water_test_result: 'Nước đạt',
            compressed_air_test_result: 'Khí nén đạt',
            filter_integrity_test_result: 'Màng lọc đạt',
            packaging_inspection_result: 'Bao bì đạt',
            finished_product_test_result: 'Thành phẩm đạt',
            sterilization_result: 'Tiệt trùng đạt',
            online_particle_result: 'Tiểu phân đạt',
            yield_quantity: '1000',
            deviation: 'Không sai lệch',
            environment_monitoring_result: 'Môi trường đạt',
            approvedBy: { name: 'Người duyệt xuất xưởng' },
          },
        ],
        cylinderCalibration: {
          ...record,
          cylinder_code: '<ống & 1>',
          calibration_number: new Prisma.Decimal('1.2345'),
        },
        tenShellWeightCheck: {
          ...record,
          ten_shells_weight: new Prisma.Decimal('0'),
          unit: 'mg',
        },
        finishedProductSummaries: [
          {
            ...record,
            package_count: 2,
            boxes_per_package: 50,
            loose_box_count: 3,
            note: '<script>bad()</script>',
          },
        ],
        primaryPackagingConfirmations: [
          { ...record, volume_weight_checked: true, sensory_checked: false },
        ],
        materialSummaries: [
          {
            ...record,
            material_code: 'NL001',
            material_name: 'Vật liệu & A',
            received_quantity: new Prisma.Decimal('1234.567'),
            used_quantity: new Prisma.Decimal('0'),
            summarizedBy: { name: 'Người tổng kết' },
          },
        ],
      },
    );
    for (const value of [
      '1,2345',
      '>0</td>',
      '>103</td>',
      'Đã kiểm tra',
      'Chưa kiểm tra',
      '1.234,567',
      'Người tổng kết',
      'operator',
      '08:30',
      '&lt;ống &amp; 1&gt;',
      '&lt;script&gt;bad()&lt;/script&gt;',
      'Đóng hộp',
      'Bao bì nguyên vẹn',
      '7,12',
      '99,9',
      'Ống bẻ',
      'Đã duyệt',
      'Ảnh kiểm nghiệm',
      'Chiết xuất',
      '12,345',
      'Môi trường đạt',
      'Người duyệt xuất xưởng',
    ])
      expect(html).toContain(value);
    expect(html).not.toContain('<script>');
  });
  it('does not read image files belonging to disabled sections', async () => {
    const html = await htmlFor(
      [{ key: 'production_order_attachments', enabled: false }],
      {
        attachments: [
          {
            files: [
              { file_path: '/production-orders/attachments/files/missing.png' },
            ],
          },
        ],
      },
    );
    expect(html).not.toContain('missing.png');
  });
  it('handles missing images and non-image date request documents without broken image tags', async () => {
    expect(
      await imageRow('Ảnh', '/production-orders/attachments/files/missing.png'),
    ).toContain('Không thể hiển thị ảnh');
    expect(
      await imageRow(
        'Yêu cầu',
        '/production-orders/date-checks/request-files/request.pdf',
      ),
    ).toContain('Tệp đính kèm: request.pdf');
    expect(
      await imageRow(
        'Ảnh',
        '/production-orders/attachments/files/../../secret.png',
      ),
    ).toContain('không hợp lệ');
    expect(await imageRow('Ảnh', 'http://127.0.0.1/private')).not.toContain(
      '<img',
    );
  });
  it('embeds a local image and preserves its caption and approval details', async () => {
    const directory = path.join(process.cwd(), 'templates', 'batch-report');
    jest
      .spyOn(fs, 'realpath')
      .mockImplementation(async (file) =>
        String(file).endsWith('logo.png')
          ? path.join(directory, 'logo.png')
          : directory,
      );
    const html = await htmlFor(
      [{ key: 'production_order_attachments', enabled: true }],
      {
        attachments: [
          {
            created_at: new Date(),
            entered_at: new Date(),
            enteredBy: { username: 'operator' },
            attachment_type: 'production',
            description: 'Ảnh sản xuất',
            requires_approval: true,
            approval_status: 'approved',
            approvedBy: { name: 'QA' },
            files: [
              {
                file_path: '/production-orders/attachments/files/logo.png',
                original_filename: '<ảnh>.png',
                note: 'Đã kiểm tra ảnh',
              },
            ],
          },
        ],
      },
    );
    expect(html).toContain('alt="&lt;ảnh&gt;.png"');
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).toContain('Đã kiểm tra ảnh');
    expect(html).toContain('Đã duyệt');
    expect(html).toContain('>QA</td>');
    expect(html).not.toContain('Không thể hiển thị ảnh');
  });
});

const describePdf =
  process.env.RUN_PDF_RENDER_TESTS === '1' ? describe : describe.skip;
describePdf('Additional sections real PDF', () => {
  it('renders all sections and paginates many records', async () => {
    const html = await htmlFor(
      keys.map((key) => ({ key, enabled: true })),
      {
        materialSummaries: Array.from({ length: 20 }, (_, index) => ({
          created_at: new Date(),
          material_code: `NL${index}`,
          material_name: 'Nguyên liệu kiểm thử',
          createdBy: { name: 'Người nhập' },
          used_quantity: new Prisma.Decimal('0'),
        })),
      },
    );
    const buffer = await new ProductionOrderPdfRendererService().render(html);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(
      (buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length,
    ).toBeGreaterThan((html.match(/<main /g) ?? []).length);
  }, 60000);
});
