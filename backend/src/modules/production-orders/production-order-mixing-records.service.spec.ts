import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderMixingRecordsService } from './production-order-mixing-records.service';

describe('ProductionOrderMixingRecordsService', () => {
  it('does not create a record from an inactive mixing template', async () => {
    const create = jest.fn();
    const service = new ProductionOrderMixingRecordsService({
      productionOrders: {
        findUnique: jest.fn().mockResolvedValue({
          id: 11,
          item_code: 'TP00001',
        }),
      },
      mixingActivityTemplates: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          item_code: 'TP00001',
          status: 'inactive',
          stages: [],
        }),
      },
      productionOrderMixingRecords: { create },
    } as unknown as PrismaService);

    await expect(
      service.create(
        11,
        {
          mixing_activity_template_id: 7,
          record_type: 'mixing',
          description: 'Lô TP00001',
        },
        { id: 3 },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(create).not.toHaveBeenCalled();
  });
});
