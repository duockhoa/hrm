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

  it('removes placeholder braces while copying a template into a record', async () => {
    const create = jest.fn().mockResolvedValue({ id: 21 });
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
          version: 1,
          status: 'active',
          stages: [
            {
              id: 1,
              stage_name: 'Giai đoạn {{number}}',
              stage_order: 1,
              steps: [
                {
                  id: 2,
                  step_name: '{{number}}',
                  step_order: 1,
                  parameters: [
                    {
                      id: 3,
                      parameter_name: 'Nhiệt độ {{number}}',
                      data_type: 'decimal',
                      unit: '{{ °C }}',
                      requirement: 'Đạt {{number}}',
                      parameter_order: 1,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
      productionOrderMixingRecords: { create },
    } as unknown as PrismaService);

    await service.create(
      11,
      {
        mixing_activity_template_id: 7,
        record_type: 'mixing',
        description: 'Lô TP00001',
      },
      { id: 3 },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stages: {
            create: [
              expect.objectContaining({
                stage_name: 'Giai đoạn number',
                steps: {
                  create: [
                    expect.objectContaining({
                      step_name: 'number',
                      parameters: {
                        create: [
                          expect.objectContaining({
                            parameter_name: 'Nhiệt độ number',
                            unit: '°C',
                            requirement: 'Đạt number',
                          }),
                        ],
                      },
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      }),
    );
  });
});
