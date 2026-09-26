import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UpdateDatePrintTemplateDto } from './dto/update-date-print-template.dto';
import { DatePrintTemplatesService } from './date-print-templates.service';

describe('DatePrintTemplatesService', () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const findItem = jest.fn();
  const service = new DatePrintTemplatesService({
    datePrintTemplates: {
      findUnique,
      findMany,
      findFirst,
      create,
      update,
      delete: remove,
    },
    items: { findUnique: findItem },
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('saves custom date formats and clears them back to defaults', async () => {
    findUnique.mockResolvedValue({ id: 1, item_code: 'TP00001' });
    await service.update(1, { manufacturing_date_format: ' {{mfg_mm}}/{{mfg_yyyy}} ', expiry_date_format: ' Xem trên nhãn ' });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { manufacturing_date_format: '{{mfg_mm}}/{{mfg_yyyy}}', expiry_date_format: 'Xem trên nhãn' } }));
    await service.update(1, { manufacturing_date_format: '', expiry_date_format: null });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { manufacturing_date_format: null, expiry_date_format: null } }));
  });

  it('creates an active template with normalized data and its creator', async () => {
    findItem.mockResolvedValue({ item_code: 'TP00001' });
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: 1, status: 'active' });

    await expect(
      service.create(
        ' TP00001 ',
        {
          version: '2',
          description: ' Mẫu in date ',
          print_content: ' NSX: {{manufacturing_date}} ',
          print_position: ' Mặt đáy chai ',
        },
        { id: '9' },
      ),
    ).resolves.toEqual({ id: 1, status: 'active' });

    expect(findItem).toHaveBeenCalledWith({
      where: { item_code: 'TP00001' },
      select: { item_code: true },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { item_code: 'TP00001', version: 2 },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          item_code: 'TP00001',
          manufacturing_date_format: null,
          expiry_date_format: null,
          version: 2,
          description: 'Mẫu in date',
          print_content: 'NSX: {{manufacturing_date}}',
          print_position: 'Mặt đáy chai',
          status: 'active',
          created_by_id: 9,
        },
      }),
    );
  });

  it('rejects a duplicate item and version before creating the template', async () => {
    findItem.mockResolvedValue({ item_code: 'TP00001' });
    findFirst.mockResolvedValue({ id: 3 });

    await expect(
      service.create(
        'TP00001',
        { version: 1, print_content: 'NSX' },
        { id: 9 },
      ),
    ).rejects.toThrow(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });

  it('updates the allowed status, print content and print position', async () => {
    findUnique.mockResolvedValue({
      id: 1,
      item_code: 'TP00001',
      image_path: null,
    });
    update.mockResolvedValue({
      id: 1,
      status: 'inactive',
      print_content: 'HSD: {{expiry_date}}',
      print_position: 'Cạnh bên bao bì',
    });

    await expect(
      service.update(1, {
        status: 'inactive',
        print_content: ' HSD: {{expiry_date}} ',
        print_position: ' Cạnh bên bao bì ',
      }),
    ).resolves.toEqual({
      id: 1,
      status: 'inactive',
      print_content: 'HSD: {{expiry_date}}',
      print_position: 'Cạnh bên bao bì',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          status: 'inactive',
          print_content: 'HSD: {{expiry_date}}',
          print_position: 'Cạnh bên bao bì',
        },
      }),
    );
  });

  it.each([undefined, null, 'draft', true])(
    'rejects an invalid status %p',
    async (status) => {
      findUnique.mockResolvedValue({ id: 1, item_code: 'TP00001' });
      await expect(
        service.update(1, { status } as unknown as UpdateDatePrintTemplateDto),
      ).rejects.toThrow(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('rejects a missing template', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.findById(99)).rejects.toThrow(NotFoundException);
  });
});
