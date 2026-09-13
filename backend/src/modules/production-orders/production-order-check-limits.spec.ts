import { BadRequestException } from '@nestjs/common';
import { normalizeCheckLimits } from './production-order-check-limits';
import { ProductionOrderSemiFinishedNetWeightChecksService } from './production-order-semi-finished-net-weight-checks.service';
import { ProductionOrderSemiFinishedGrossWeightChecksService } from './production-order-semi-finished-gross-weight-checks.service';
import { ProductionOrderVolumeChecksService } from './production-order-volume-checks.service';
import { PrismaService } from 'src/prisma.service';

describe.each([
  [
    ProductionOrderSemiFinishedNetWeightChecksService,
    'productionOrderSemiFinishedProductNetWeightChecks',
    'unit_1_net_weight',
  ],
  [
    ProductionOrderSemiFinishedGrossWeightChecksService,
    'productionOrderSemiFinishedProductGrossWeightChecks',
    'unit_1_gross_weight',
  ],
  [
    ProductionOrderVolumeChecksService,
    'productionOrderVolumeChecks',
    'unit_1_volume',
  ],
] as const)('%s limits', (Service, model, measurement) => {
  const existing = { id: 1, lower_limit: 1, upper_limit: 5 };
  let delegate: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  let service: InstanceType<typeof Service>;
  beforeEach(() => {
    delegate = {
      findUnique: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new Service({
      productionOrders: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      [model]: delegate,
    } as unknown as PrismaService);
  });
  it('persists limits on creation', async () => {
    await service.create(
      1,
      { [measurement]: 2, lower_limit: '1,25', upper_limit: 5 },
      { id: 1 },
    );
    const data = delegate.create.mock.calls[0][0].data;
    expect(data.lower_limit.toString()).toBe('1.25');
    expect(data.upper_limit.toString()).toBe('5');
  });
  it('allows updating only a limit', async () => {
    await service.update(1, { upper_limit: 6 });
    const data = delegate.update.mock.calls[0][0].data;
    expect(data.upper_limit.toString()).toBe('6');
    expect(data).not.toHaveProperty('lower_limit');
  });
  it('checks a partial update against the stored opposite limit', async () => {
    await expect(service.update(1, { lower_limit: 6 })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.update(1, { upper_limit: 0 })).rejects.toThrow(
      BadRequestException,
    );
    expect(delegate.update).not.toHaveBeenCalled();
  });
  it('allows clearing a limit', async () => {
    await service.update(1, { lower_limit: null });
    expect(delegate.update.mock.calls[0][0].data.lower_limit).toBeNull();
  });
});

describe('normalizeCheckLimits', () => {
  it('supports omitted limits and zero', () => {
    expect(normalizeCheckLimits({}, 3)).toEqual({
      lower_limit: null,
      upper_limit: null,
    });
    expect(
      normalizeCheckLimits(
        { lower_limit: 0, upper_limit: 0 },
        3,
      ).lower_limit?.toString(),
    ).toBe('0');
  });
  it.each([-1, true, 'abc', Infinity, '100000000', '1.234'])(
    'rejects invalid volume limit %s',
    (value) => {
      expect(() => normalizeCheckLimits({ lower_limit: value }, 2)).toThrow(
        BadRequestException,
      );
    },
  );
  it('preserves weight precision and rejects reversed ranges', () => {
    expect(
      normalizeCheckLimits({ lower_limit: '0.123' }, 3).lower_limit?.toString(),
    ).toBe('0.123');
    expect(() =>
      normalizeCheckLimits({ lower_limit: 2, upper_limit: 1 }, 3),
    ).toThrow(BadRequestException);
  });
});
