import PizZip from 'pizzip';
import path from 'node:path';
import {
  datePrintParts,
  datePrintData,
  exportDatePrint,
} from './date-print-export';
import { resolveDatePrintTemplateImageFile } from '../../items/date-print-template-image-upload.config';

jest.mock('../../items/date-print-template-image-upload.config', () => ({
  DATE_PRINT_TEMPLATE_IMAGE_ROUTE: '/items/date-print-templates/images',
  resolveDatePrintTemplateImageFile: jest.fn(),
}));

const order = {
  id: 123,
  item_code: 'SP01',
  item: { item_name: 'Sản phẩm A & B' },
  lot_no: 'LO001',
  date_manufacture: '2026-09-03',
  expire_date: '2028-09-03',
} as Parameters<typeof exportDatePrint>[0];
const template = {
  id: 1,
  version: 2,
  item_code: 'SP01',
  status: 'active',
  image_path: null,
  print_position: 'Mép trên túi',
  print_content:
    'NSX: {{mfg_dd}}/{{mfg_mm}}/{{mfg_yyyy}} ({{mfg_yy}})\nHSD: {{exp_dd}}{{exp_mm}}{{exp_yy}} ({{exp_yyyy}})\nLSX: {{batch_number}}',
} as Parameters<typeof exportDatePrint>[1];

describe('date print Word export', () => {
  it('fills the note in the updated Word template and defaults to blank', async () => {
    const output = await exportDatePrint(order, template, 'Kiểm tra A & B\nDòng thứ hai');
    const xml = new PizZip(output.buffer).file('word/document.xml')!.asText();
    expect(xml).toContain('Kiểm tra A &amp; B');
    expect(xml).toContain('Dòng thứ hai');
    expect(xml).not.toContain('{{');
    expect(datePrintData(order, template).note).toBe('');
  });
  it('renders custom date fields independently and preserves print content', () => {
    const result = datePrintData(order, { ...template,
      manufacturing_date_format: '{{mfg_dd}}/{{mfg_mm}}/{{mfg_yyyy}} - {{batch_number}}',
      expiry_date_format: 'Xem trên nhãn: {{exp_mm}}/{{exp_yyyy}}',
    });
    expect(result.date_manufacture).toBe('03/09/2026 - LO001');
    expect(result.expire_date).toBe('Xem trên nhãn: 09/2028');
    expect(result.required_print_content).toBe(datePrintData(order, template).required_print_content);
    expect(datePrintData(order, { ...template, manufacturing_date_format: '   ', expiry_date_format: null })).toMatchObject({ date_manufacture: '030926', expire_date: '030928' });
    expect(() => datePrintData(order, { ...template, expiry_date_format: '{{invalid}}' })).toThrow('invalid');
  });
  it.each([
    '2026-09-03',
    '03/09/2026',
    '20260903',
    '03092026',
    '2026-09-03T00:00:00Z',
  ])('parses %s without timezone shifts', (value) => {
    expect(datePrintParts(value, 'NSX')).toEqual({
      dd: '03',
      mm: '09',
      yy: '26',
      yyyy: '2026',
    });
  });
  it.each([null, '', '31/02/2026', '2026-13-01', '030926'])(
    'rejects missing or invalid dates: %s',
    (value) => {
      expect(() => datePrintParts(value, 'NSX')).toThrow();
    },
  );
  it('renders all date variables and lot number with line breaks', () => {
    expect(datePrintData(order, template).required_print_content).toBe(
      'NSX: 03/09/2026 (26)\nHSD: 030928 (2028)\nLSX: LO001',
    );
    expect(
      datePrintData(order, {
        ...template,
        print_content: '{{manufacturing_date}} — {{expiry_date}}',
      }).required_print_content,
    ).toBe('03/09/2026 — 03/09/2028');
  });
  it('rejects unknown variables instead of printing unresolved placeholders', () => {
    expect(() =>
      datePrintData(order, { ...template, print_content: '{{typo}}' }),
    ).toThrow('typo');
  });
  it('formats the production and expiry date fields as ddmmyy', () => {
    expect(datePrintData({
      ...order,
      date_manufacture: '2026-10-02',
      expire_date: '2028-10-02',
    }, template)).toMatchObject({
      date_manufacture: '021026',
      expire_date: '021028',
    });
  });

  it('renders the real Word template, preserving headers and escaping XML', async () => {
    const output = await exportDatePrint(order, template);
    const zip = new PizZip(output.buffer);
    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).toContain('Sản phẩm A &amp; B');
    expect(xml).toContain('NSX: 03/09/2026 (26)');
    expect(xml).toContain('LSX: LO001');
    expect(xml).toContain('Mép trên túi');
    expect(xml).not.toContain('{{');
    expect(xml).not.toContain('undefined');
    expect(zip.file('word/header1.xml')).not.toBeNull();
  });
  it('embeds the image in the final illustration table cell', async () => {
    jest
      .mocked(resolveDatePrintTemplateImageFile)
      .mockResolvedValue({
        filePath: path.join(process.cwd(), 'templates/batch-report/logo.png'),
        contentType: 'image/png',
      });
    const output = await exportDatePrint(order, {
      ...template,
      image_path: '/items/date-print-templates/images/example.png',
    });
    const zip = new PizZip(output.buffer);
    const xml = zip.file('word/document.xml')!.asText();
    expect(zip.file('word/media/date-print-example.png')).not.toBeNull();
    const finalCell = xml.slice(
      xml.lastIndexOf('<w:tc>'),
      xml.lastIndexOf('</w:tc>'),
    );
    expect(finalCell).toContain('rIdDatePrintExample');
    expect(zip.file('word/_rels/document.xml.rels')!.asText()).toContain(
      'Target="media/date-print-example.png"',
    );
  });
  it('reports missing illustration files', async () => {
    jest.mocked(resolveDatePrintTemplateImageFile).mockResolvedValue(null);
    await expect(
      exportDatePrint(order, {
        ...template,
        image_path: '/items/date-print-templates/images/missing.png',
      }),
    ).rejects.toThrow('Không tìm thấy ảnh');
  });
});
