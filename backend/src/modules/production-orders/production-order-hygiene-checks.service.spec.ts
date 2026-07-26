import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderHygieneChecksService } from './production-order-hygiene-checks.service';

describe('ProductionOrderHygieneChecksService', () => {
  let service: ProductionOrderHygieneChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderHygieneChecks: {
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
      productionOrderHygieneChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderHygieneChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderHygieneChecksService>(
      ProductionOrderHygieneChecksService,
    );
  });

  it('gets hygiene checks for a production order', async () => {
    const hygieneChecks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderHygieneChecks.findMany.mockResolvedValue(
      hygieneChecks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      hygieneChecks,
    );
    expect(
      prismaService.productionOrderHygieneChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets a hygiene check by id', async () => {
    const hygieneCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderHygieneChecks.findUnique.mockResolvedValue(
      hygieneCheck,
    );

    await expect(service.findById(1)).resolves.toBe(hygieneCheck);
    expect(
      prismaService.productionOrderHygieneChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the hygiene check does not exist', async () => {
    prismaService.productionOrderHygieneChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a hygiene check with normalized input', async () => {
    const createdHygieneCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderHygieneChecks.create.mockResolvedValue(
      createdHygieneCheck,
    );

    const result = await service.create(
      2031,
      {
        room_or_equipment: ' Phong pha che 1 ',
        cleaning_type: ' Ve sinh dinh ky ',
        result: ' Dat ',
        note: ' Khong ',
      },
      { id: 7 },
    );

    expect(result).toBe(createdHygieneCheck);
    expect(
      prismaService.productionOrderHygieneChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_id: 2031,
          room_or_equipment: 'Phong pha che 1',
          cleaning_type: 'Ve sinh dinh ky',
          result: 'Dat',
          note: 'Khong',
          created_by_id: 7,
        }),
      }),
    );
  });

  it('sets blank note to null when creating', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderHygieneChecks.create.mockResolvedValue({
      id: 1,
    });

    await service.create(
      2031,
      {
        room_or_equipment: 'Phong pha che 1',
        cleaning_type: 'Ve sinh dinh ky',
        result: 'Dat',
        note: '   ',
      },
      { id: 7 },
    );

    expect(
      prismaService.productionOrderHygieneChecks.create.mock.calls[0][0].data
        .note,
    ).toBeNull();
  });

  it('updates provided hygiene check fields', async () => {
    const updatedHygieneCheck = { id: 1, result: 'Khong dat' };
    prismaService.productionOrderHygieneChecks.findUnique.mockResolvedValue({
      id: 1,
      production_order_id: 2031,
    });
    prismaService.productionOrderHygieneChecks.update.mockResolvedValue(
      updatedHygieneCheck,
    );

    await expect(
      service.update(1, {
        result: ' Khong dat ',
        note: null,
      }),
    ).resolves.toBe(updatedHygieneCheck);
    expect(
      prismaService.productionOrderHygieneChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
        data: expect.objectContaining({
          result: 'Khong dat',
          note: null,
        }),
      }),
    );
  });

  it('deletes a hygiene check', async () => {
    const deletedHygieneCheck = { id: 1 };
    prismaService.productionOrderHygieneChecks.findUnique.mockResolvedValue({
      id: 1,
    });
    prismaService.productionOrderHygieneChecks.delete.mockResolvedValue(
      deletedHygieneCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedHygieneCheck);
    expect(
      prismaService.productionOrderHygieneChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws BadRequestException when a required field is blank', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          room_or_equipment: ' ',
          cleaning_type: 'Ve sinh dinh ky',
          result: 'Dat',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when update has no fields', async () => {
    prismaService.productionOrderHygieneChecks.findUnique.mockResolvedValue({
      id: 1,
    });

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        room_or_equipment: 'Phong pha che 1',
        cleaning_type: 'Ve sinh dinh ky',
        result: 'Dat',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
