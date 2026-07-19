import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { EquipmentMonitoringRecordsService } from './equipment-monitoring-records.service';

describe('EquipmentMonitoringRecordsService', () => {
  let service: EquipmentMonitoringRecordsService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    equipment: {
      findUnique: jest.Mock;
    };
    equipmentParameters: {
      findMany: jest.Mock;
    };
    equipmentMonitoringRecords: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    equipmentMonitoringValues: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentMonitoringRecordsService,
        {
          provide: PrismaService,
          useValue: {
            productionOrders: {
              findUnique: jest.fn(),
            },
            equipment: {
              findUnique: jest.fn(),
            },
            equipmentParameters: {
              findMany: jest.fn(),
            },
            equipmentMonitoringRecords: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            equipmentMonitoringValues: {
              deleteMany: jest.fn(),
              createMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EquipmentMonitoringRecordsService>(
      EquipmentMonitoringRecordsService,
    );
    prismaService = module.get(PrismaService);
  });

  it('creates a monitoring record with normalized text values', async () => {
    const record = {
      id: 1,
      production_order_id: 1001,
      equipment_id: 10,
    };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 1001 });
    prismaService.equipment.findUnique.mockResolvedValue({ id: 10 });
    prismaService.equipmentParameters.findMany.mockResolvedValue([
      {
        id: 1,
        equipment_id: 10,
        name: 'Nhiet do',
        data_type: 'number',
        is_required: true,
      },
      {
        id: 2,
        equipment_id: 10,
        name: 'Ket luan',
        data_type: 'text',
        is_required: true,
      },
    ]);
    prismaService.equipmentMonitoringRecords.create.mockResolvedValue(record);

    await expect(
      service.create(
        {
          production_order_id: '1001',
          equipment_id: '10',
          note: ' Dau ca ',
          values: [
            {
              parameter_id: '1',
              value: '25,5',
              note: ' On dinh ',
            },
            {
              parameter_id: 2,
              value: ' Dat ',
            },
          ],
        },
        { id: '7' },
      ),
    ).resolves.toBe(record);

    expect(prismaService.equipmentMonitoringRecords.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_id: 1001,
          equipment_id: 10,
          note: 'Dau ca',
          created_by_id: 7,
          values: {
            create: [
              {
                parameter_id: 1,
                value: '25.5',
                note: 'On dinh',
              },
              {
                parameter_id: 2,
                value: 'Dat',
                note: null,
              },
            ],
          },
        }),
      }),
    );
  });

  it('rejects values for parameters that do not belong to the equipment', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 1001 });
    prismaService.equipment.findUnique.mockResolvedValue({ id: 10 });
    prismaService.equipmentParameters.findMany.mockResolvedValue([
      {
        id: 1,
        equipment_id: 10,
        name: 'Nhiet do',
        data_type: 'number',
        is_required: true,
      },
    ]);

    await expect(
      service.create(
        {
          production_order_id: 1001,
          equipment_id: 10,
          values: [
            {
              parameter_id: 2,
              value: '25',
            },
          ],
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
