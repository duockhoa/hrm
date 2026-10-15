import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderPostSecondaryPackagingSummariesService } from './production-order-post-secondary-packaging-summaries.service';

describe('ProductionOrderPostSecondaryPackagingSummariesService', () => {
  let service: ProductionOrderPostSecondaryPackagingSummariesService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderPostSecondaryPackagingSummaries: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    productionOrderPostSecondaryPackagingPendingProcessItems: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    productionOrderPostSecondaryPackagingPendingCancellationItems: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderPostSecondaryPackagingSummaries: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productionOrderPostSecondaryPackagingPendingProcessItems: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productionOrderPostSecondaryPackagingPendingCancellationItems: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderPostSecondaryPackagingSummariesService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderPostSecondaryPackagingSummariesService>(
      ProductionOrderPostSecondaryPackagingSummariesService,
    );
  });

  it('stores a normalized unit when creating a summary', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderPostSecondaryPackagingSummaries.create.mockResolvedValue(
      { id: 1, unit: 'kg' },
    );

    await expect(
      service.create(
        2031,
        {
          semi_finished_product_order_id: 2030,
          received_bag_count: 12,
          remaining_quantity: '3.5',
          unit: ' kg ',
        },
        { id: 7 },
      ),
    ).resolves.toEqual({ id: 1, unit: 'kg' });

    expect(
      prismaService.productionOrderPostSecondaryPackagingSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unit: 'kg',
        }),
      }),
    );
  });

  it('updates and clears the unit', async () => {
    prismaService.productionOrderPostSecondaryPackagingSummaries.findUnique.mockResolvedValue(
      { id: 1, production_order_id: 2031 },
    );
    prismaService.productionOrderPostSecondaryPackagingSummaries.update.mockResolvedValue(
      { id: 1, unit: null },
    );

    await expect(service.update(1, { unit: '' })).resolves.toEqual({
      id: 1,
      unit: null,
    });
    expect(
      prismaService.productionOrderPostSecondaryPackagingSummaries.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { unit: null },
      }),
    );
  });

  it('allows a semi-finished production order to be reused by another summary', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2032 });
    prismaService.productionOrderPostSecondaryPackagingSummaries.create.mockResolvedValue(
      {
        id: 2,
        production_order_id: 2032,
        semi_finished_product_order_id: 2030,
      },
    );

    await expect(
      service.create(
        2032,
        {
          semi_finished_product_order_id: 2030,
          received_bag_count: 8,
          remaining_quantity: '1',
        },
        { id: 7 },
      ),
    ).resolves.toEqual({
      id: 2,
      production_order_id: 2032,
      semi_finished_product_order_id: 2030,
    });
  });

  it('includes each pending item unit in report data', async () => {
    await service.findAllForReport();

    expect(
      prismaService.productionOrderPostSecondaryPackagingSummaries.findMany,
    ).toHaveBeenCalledWith({
      select: expect.objectContaining({
        pendingProcessItems: {
          select: { id: true, pending_quantity: true, unit: true },
        },
        pendingCancellationItems: {
          select: { id: true, cancellation_quantity: true, unit: true },
        },
      }),
    });
  });

  describe.each(['process', 'cancellation'] as const)(
    '%s item units',
    (kind) => {
      const model = () =>
        kind === 'process'
          ? prismaService.productionOrderPostSecondaryPackagingPendingProcessItems
          : prismaService.productionOrderPostSecondaryPackagingPendingCancellationItems;
      const create = (unit?: string | null) =>
        kind === 'process'
          ? service.createPendingProcessItem(
              1,
              {
                pending_quantity: '2.5',
                pending_reason: 'QA review',
                unit,
              },
              { id: 7 },
            )
          : service.createPendingCancellationItem(
              1,
              {
                cancellation_quantity: '2.5',
                cancellation_reason: 'QA review',
                unit,
              },
              { id: 7 },
            );
      const update = (unit: string | null) =>
        kind === 'process'
          ? service.updatePendingProcessItem(2, { unit })
          : service.updatePendingCancellationItem(2, { unit });

      beforeEach(() => {
        prismaService.productionOrderPostSecondaryPackagingSummaries.findUnique.mockResolvedValue(
          {
            id: 1,
            production_order_id: 2031,
            unit: 'hộp',
          },
        );
        model().findUnique.mockResolvedValue({
          id: 2,
          summary_id: 1,
          unit: 'kg',
        });
      });

      it('stores an independent, trimmed unit on creation', async () => {
        await create(' kg ');
        expect(model().create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ unit: 'kg', summary_id: 1 }),
          }),
        );
      });

      it.each([undefined, null, ''])(
        'accepts an unspecified unit: %s',
        async (unit) => {
          await create(unit);
          expect(model().create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({ unit: null }),
            }),
          );
        },
      );

      it('updates only the unit without changing other fields', async () => {
        await update(' viên ');
        expect(model().update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 2 },
            data: { unit: 'viên' },
          }),
        );
      });

      it.each([null, '', '   '])('clears the unit with %s', async (unit) => {
        await update(unit);
        expect(model().update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { unit: null },
          }),
        );
      });

      it('preserves the unit when an update omits it', async () => {
        if (kind === 'process') {
          await service.updatePendingProcessItem(2, {
            pending_reason: 'Updated',
          });
        } else {
          await service.updatePendingCancellationItem(2, {
            cancellation_reason: 'Updated',
          });
        }
        expect(model().update).toHaveBeenCalledWith(
          expect.objectContaining({
            data:
              kind === 'process'
                ? { pending_reason: 'Updated' }
                : { cancellation_reason: 'Updated' },
          }),
        );
      });

      it.each(['x'.repeat(21), 123])(
        'rejects invalid units on creation and update: %s',
        async (unit) => {
          await expect(create(unit as string)).rejects.toThrow('unit must be');
          await expect(update(unit as string)).rejects.toThrow('unit must be');
          expect(model().create).not.toHaveBeenCalled();
          expect(model().update).not.toHaveBeenCalled();
        },
      );
    },
  );
});
