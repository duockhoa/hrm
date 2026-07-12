import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderHardCapsuleLeakageChecksService } from './production-order-hard-capsule-leakage-checks.service';

describe('ProductionOrderHardCapsuleLeakageChecksService', () => {
  let service: ProductionOrderHardCapsuleLeakageChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderHardCapsuleLeakageChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderHardCapsuleLeakageChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderHardCapsuleLeakageChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderHardCapsuleLeakageChecksService>(
      ProductionOrderHardCapsuleLeakageChecksService,
    );
  });

  it('gets leakage checks for a production order', async () => {
    const leakageChecks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderHardCapsuleLeakageChecks.findMany.mockResolvedValue(
      leakageChecks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      leakageChecks,
    );
    expect(
      prismaService.productionOrderHardCapsuleLeakageChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets a leakage check by id', async () => {
    const leakageCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderHardCapsuleLeakageChecks.findUnique.mockResolvedValue(
      leakageCheck,
    );

    await expect(service.findById(1)).resolves.toBe(leakageCheck);
    expect(
      prismaService.productionOrderHardCapsuleLeakageChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the leakage check does not exist', async () => {
    prismaService.productionOrderHardCapsuleLeakageChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['Trước bao', 'before_coating'],
    ['sau_bao', 'after_coating'],
  ])(
    'creates a leakage check and normalizes stage %s',
    async (stage, storedStage) => {
      const createdLeakageCheck = { id: 1, production_order_id: 2031 };
      prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
      prismaService.productionOrderHardCapsuleLeakageChecks.create.mockResolvedValue(
        createdLeakageCheck,
      );

      const result = await service.create(
        2031,
        {
          stage,
          tested_capsule_count: '100',
          leaked_capsule_count: 2,
        },
        { id: 7 },
      );

      expect(result).toBe(createdLeakageCheck);
      expect(
        prismaService.productionOrderHardCapsuleLeakageChecks.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            production_order_id: 2031,
            stage: storedStage,
            tested_capsule_count: 100,
            leaked_capsule_count: 2,
            created_by_id: 7,
          },
        }),
      );
    },
  );

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only the provided fields and validates final capsule counts', async () => {
    const updatedLeakageCheck = {
      id: 1,
      stage: 'after_coating',
      tested_capsule_count: 100,
      leaked_capsule_count: 5,
    };
    prismaService.productionOrderHardCapsuleLeakageChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        tested_capsule_count: 100,
        leaked_capsule_count: 2,
      },
    );
    prismaService.productionOrderHardCapsuleLeakageChecks.update.mockResolvedValue(
      updatedLeakageCheck,
    );

    await expect(
      service.update(1, {
        stage: 'Sau bao',
        leaked_capsule_count: '5',
      }),
    ).resolves.toBe(updatedLeakageCheck);
    expect(
      prismaService.productionOrderHardCapsuleLeakageChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          stage: 'after_coating',
          leaked_capsule_count: 5,
        },
      }),
    );
  });

  it('rejects an update without any supported fields', async () => {
    prismaService.productionOrderHardCapsuleLeakageChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        tested_capsule_count: 100,
        leaked_capsule_count: 2,
      },
    );

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('rejects an update when leaked count exceeds the final tested count', async () => {
    prismaService.productionOrderHardCapsuleLeakageChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        tested_capsule_count: 100,
        leaked_capsule_count: 20,
      },
    );

    await expect(
      service.update(1, {
        tested_capsule_count: 10,
      }),
    ).rejects.toThrow(
      'leaked_capsule_count cannot exceed tested_capsule_count',
    );
  });

  it('throws NotFoundException when updating a missing leakage check', async () => {
    prismaService.productionOrderHardCapsuleLeakageChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.update(1, {
        leaked_capsule_count: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes an existing leakage check', async () => {
    const deletedLeakageCheck = { id: 1 };
    prismaService.productionOrderHardCapsuleLeakageChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        tested_capsule_count: 100,
        leaked_capsule_count: 2,
      },
    );
    prismaService.productionOrderHardCapsuleLeakageChecks.delete.mockResolvedValue(
      deletedLeakageCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedLeakageCheck);
    expect(
      prismaService.productionOrderHardCapsuleLeakageChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
      }),
    );
  });

  it('rejects a stage outside before and after coating', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          stage: 'during_coating',
          tested_capsule_count: 100,
          leaked_capsule_count: 2,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a leaked count greater than the tested count', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          stage: 'before_coating',
          tested_capsule_count: 10,
          leaked_capsule_count: 11,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a tested count of zero', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          stage: 'before_coating',
          tested_capsule_count: 0,
          leaked_capsule_count: 0,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a boolean count value', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          stage: 'before_coating',
          tested_capsule_count: true as unknown as number,
          leaked_capsule_count: 0,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        stage: 'after_coating',
        tested_capsule_count: 100,
        leaked_capsule_count: 0,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
