import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { EquipmentIncidentReportsService } from './equipment-incident-reports.service';

describe('EquipmentIncidentReportsService', () => {
  let service: EquipmentIncidentReportsService;
  let prismaService: {
    equipment: {
      findUnique: jest.Mock;
    };
    equipmentIncidentReports: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentIncidentReportsService,
        {
          provide: PrismaService,
          useValue: {
            equipment: {
              findUnique: jest.fn(),
            },
            equipmentIncidentReports: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EquipmentIncidentReportsService>(
      EquipmentIncidentReportsService,
    );
    prismaService = module.get(PrismaService);
  });

  it('creates a normalized incident report using the authenticated user', async () => {
    prismaService.equipment.findUnique.mockResolvedValue({ id: 2 });
    prismaService.equipmentIncidentReports.create.mockResolvedValue({ id: 1 });

    await expect(
      service.create(
        {
          equipment_id: '2',
          title: ' Máy dừng đột ngột ',
          description: ' Không khởi động lại được. ',
          priority: ' high ',
          status: ' open ',
        },
        { id: '7' },
      ),
    ).resolves.toEqual({ id: 1 });

    expect(prismaService.equipment.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
      select: { id: true },
    });
    expect(prismaService.equipmentIncidentReports.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          equipment_id: 2,
          title: 'Máy dừng đột ngột',
          description: 'Không khởi động lại được.',
          priority: 'HIGH',
          status: 'OPEN',
          created_by_id: 7,
        },
      }),
    );
  });

  it('uses default priority and status when creating an incident report', async () => {
    prismaService.equipment.findUnique.mockResolvedValue({ id: 2 });
    prismaService.equipmentIncidentReports.create.mockResolvedValue({ id: 1 });

    await service.create(
      {
        equipment_id: 2,
        title: 'Máy rung bất thường',
        description: 'Có tiếng ồn lớn.',
      },
      { id: 7 },
    );

    expect(prismaService.equipmentIncidentReports.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          priority: 'MEDIUM',
          status: 'OPEN',
        }),
      }),
    );
  });

  it('filters incident reports by equipment, status, and priority', async () => {
    prismaService.equipmentIncidentReports.findMany.mockResolvedValue([]);

    await service.findAll({
      equipment_id: '2',
      status: 'in_progress',
      priority: 'high',
    });

    expect(
      prismaService.equipmentIncidentReports.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          equipment_id: 2,
          status: 'IN_PROGRESS',
          priority: 'HIGH',
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('updates only supplied report fields', async () => {
    prismaService.equipmentIncidentReports.findUnique.mockResolvedValue({
      id: 1,
    });
    prismaService.equipmentIncidentReports.update.mockResolvedValue({ id: 1 });

    await service.update(1, { status: 'resolved' });

    expect(prismaService.equipmentIncidentReports.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { status: 'RESOLVED' },
      }),
    );
  });

  it('rejects an invalid priority', async () => {
    await expect(
      service.create(
        {
          equipment_id: 2,
          title: 'Máy rung bất thường',
          description: 'Có tiếng ồn lớn.',
          priority: 'URGENT',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an authenticated user to create an incident report', async () => {
    await expect(
      service.create({ equipment_id: 2, title: 'Sự cố', description: 'Mô tả' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when the selected equipment does not exist', async () => {
    prismaService.equipment.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        { equipment_id: 2, title: 'Sự cố', description: 'Mô tả' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
