import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionWorkshopCleaningChecklistsService } from './production-workshop-cleaning-checklists.service';

describe('ProductionWorkshopCleaningChecklistsService', () => {
  let service: ProductionWorkshopCleaningChecklistsService;
  let prismaService: {
    productionWorkshops: { findUnique: jest.Mock };
    users: { findUnique: jest.Mock };
    productionWorkshopCleaningChecklists: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionWorkshopCleaningChecklistsService,
        {
          provide: PrismaService,
          useValue: {
            productionWorkshops: { findUnique: jest.fn() },
            users: { findUnique: jest.fn() },
            productionWorkshopCleaningChecklists: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductionWorkshopCleaningChecklistsService>(
      ProductionWorkshopCleaningChecklistsService,
    );
    prismaService = module.get(PrismaService);
  });

  it('creates a cleaning checklist with normalized data', async () => {
    const checklist = { id: 1, workshop_id: 1, cleaned_by_id: 2 };
    prismaService.productionWorkshops.findUnique.mockResolvedValue({ id: 1 });
    prismaService.users.findUnique.mockResolvedValue({ id: 2 });
    prismaService.productionWorkshopCleaningChecklists.create.mockResolvedValue(
      checklist,
    );

    await expect(
      service.create(1, {
        subject: ' Ban thao tac ',
        category: ' Ve sinh dinh ky ',
        requirement: ' Sach, khong con bui ',
        result: ' Dat ',
        note: '  Da hoan thanh  ',
        cleaned_by_id: '2',
      }),
    ).resolves.toBe(checklist);

    expect(
      prismaService.productionWorkshopCleaningChecklists.create,
    ).toHaveBeenCalledWith({
      data: {
        workshop_id: 1,
        subject: 'Ban thao tac',
        category: 'Ve sinh dinh ky',
        requirement: 'Sach, khong con bui',
        result: 'Dat',
        note: 'Da hoan thanh',
        cleaned_by_id: 2,
      },
      include: expect.any(Object),
    });
  });

  it('lists cleaning checklists by workshop ordered newest first', async () => {
    prismaService.productionWorkshops.findUnique.mockResolvedValue({ id: 1 });
    prismaService.productionWorkshopCleaningChecklists.findMany.mockResolvedValue(
      [],
    );

    await service.findAllByProductionWorkshop(1);

    expect(
      prismaService.productionWorkshopCleaningChecklists.findMany,
    ).toHaveBeenCalledWith({
      where: { workshop_id: 1 },
      include: expect.any(Object),
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('updates the selected cleaning user after validating it exists', async () => {
    prismaService.productionWorkshopCleaningChecklists.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.users.findUnique.mockResolvedValue({ id: 3 });
    prismaService.productionWorkshopCleaningChecklists.update.mockResolvedValue({
      id: 1,
      cleaned_by_id: 3,
    });

    await service.update(1, { cleaned_by_id: '3' });

    expect(
      prismaService.productionWorkshopCleaningChecklists.update,
    ).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { cleaned_by_id: 3 },
      include: expect.any(Object),
    });
  });
});
