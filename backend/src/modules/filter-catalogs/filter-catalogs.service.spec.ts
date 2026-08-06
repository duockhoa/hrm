import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { FilterCatalogsService } from './filter-catalogs.service';

describe('FilterCatalogsService', () => {
  let service: FilterCatalogsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      filterCatalogs: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilterCatalogsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(FilterCatalogsService);
  });

  it('creates a filter catalog with nullable usable steam cycles', async () => {
    prismaService.filterCatalogs.findUnique.mockResolvedValue(null);
    prismaService.filterCatalogs.create.mockResolvedValue({ id: 1 });

    await service.create(
      {
        filter_code: 'LOC-001',
        filter_type: 'HEPA',
        usable_steam_cycles: null,
        description: ' Lọc khí ',
      },
      { id: 7 },
    );

    expect(prismaService.filterCatalogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          filter_code: 'LOC-001',
          filter_type: 'HEPA',
          usable_steam_cycles: null,
          pre_filter_sensory_requirement: null,
          post_filter_sensory_requirement: null,
          integrity_requirement: null,
          description: 'Lọc khí',
          created_by_id: 7,
        },
      }),
    );
  });

  it('updates usable steam cycles from a numeric string', async () => {
    prismaService.filterCatalogs.findUnique.mockResolvedValue({
      id: 1,
      filter_code: 'LOC-001',
    });
    prismaService.filterCatalogs.update.mockResolvedValue({ id: 1 });

    await service.update(1, { usable_steam_cycles: '25' });

    expect(prismaService.filterCatalogs.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usable_steam_cycles: 25 } }),
    );
  });

  it('updates pre-filter, post-filter sensory and integrity requirements', async () => {
    prismaService.filterCatalogs.findUnique.mockResolvedValue({ id: 1 });
    prismaService.filterCatalogs.update.mockResolvedValue({ id: 1 });

    await service.update(1, {
      pre_filter_sensory_requirement: 'Màng sạch',
      post_filter_sensory_requirement: 'Không biến dạng',
      integrity_requirement: 'Không rò rỉ',
    });

    expect(prismaService.filterCatalogs.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          pre_filter_sensory_requirement: 'Màng sạch',
          post_filter_sensory_requirement: 'Không biến dạng',
          integrity_requirement: 'Không rò rỉ',
        },
      }),
    );
  });

  it('rejects an invalid usable steam cycle count', async () => {
    await expect(
      service.create(
        {
          filter_code: 'LOC-001',
          filter_type: 'HEPA',
          usable_steam_cycles: -1,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate filter code', async () => {
    prismaService.filterCatalogs.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.create(
        { filter_code: 'LOC-001', filter_type: 'HEPA' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires an authenticated user when creating', async () => {
    prismaService.filterCatalogs.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ filter_code: 'LOC-001', filter_type: 'HEPA' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
