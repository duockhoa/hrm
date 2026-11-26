import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';
import { WarehouseTemperatureHumidityChecksService } from './warehouse-temperature-humidity-checks.service';

describe('WarehouseTemperatureHumidityChecksService', () => {
  const prisma = {
    warehouseTemperatureHumidityChecks: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    users: { findFirst: jest.fn() },
  };
  const service = new WarehouseTemperatureHumidityChecksService(
    prisma as unknown as PrismaService,
  );
  const dto = {
    location: ' A1 ',
    requirement: ' Độ ẩm ≤ 75% ',
    temperature: 25.5,
    humidity: 65.25,
  };

  it('combines ranges, result and Vietnam dates before counting', async () => {
    prisma.warehouseTemperatureHumidityChecks.findMany.mockResolvedValue([]);
    prisma.warehouseTemperatureHumidityChecks.count.mockResolvedValue(0);
    await service.findAll({
      location: 'A1',
      temperature_min: '-5',
      temperature_max: '0',
      humidity_max: '70',
      result: 'fail',
      from_date: '2026-11-26',
      to_date: '2026-11-26',
      page: 2,
      limit: 300,
    });
    expect(
      prisma.warehouseTemperatureHumidityChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 300,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { location: { contains: 'A1' } },
            { temperature: { gte: '-5', lte: '0' } },
            { is_passed: false },
            {
              created_at: {
                gte: new Date('2026-11-25T17:00:00Z'),
                lt: new Date('2026-11-26T17:00:00Z'),
              },
            },
          ]),
        }),
      }),
    );
  });

  it('pages and counts the same server search before returning results', async () => {
    const rows = [{ id: 301 }];
    prisma.warehouseTemperatureHumidityChecks.findMany.mockResolvedValue(rows);
    prisma.warehouseTemperatureHumidityChecks.count.mockResolvedValue(301);
    const result = await service.findAll({
      search: 'Kho_A%',
      page: 2,
      limit: 300,
    });
    expect(result).toEqual({ data: rows, total: 301, page: 2, limit: 300 });
    const query =
      prisma.warehouseTemperatureHumidityChecks.findMany.mock.calls[0][0];
    expect(query).toMatchObject({
      skip: 300,
      take: 300,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    expect(
      prisma.warehouseTemperatureHumidityChecks.count,
    ).toHaveBeenCalledWith({ where: query.where });
    expect(JSON.stringify(query.where)).toContain(
      JSON.stringify('Kho\\_A\\%').slice(1, -1),
    );
  });

  it('keeps unpaged responses compatible with existing callers', async () => {
    prisma.warehouseTemperatureHumidityChecks.findMany.mockResolvedValue([
      { id: 1 },
    ]);
    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
    expect(
      prisma.warehouseTemperatureHumidityChecks.findMany.mock.calls[0][0],
    ).not.toHaveProperty('take');
    expect(
      prisma.warehouseTemperatureHumidityChecks.count,
    ).not.toHaveBeenCalled();
  });

  it('returns an empty final page', async () => {
    prisma.warehouseTemperatureHumidityChecks.findMany.mockResolvedValue([]);
    prisma.warehouseTemperatureHumidityChecks.count.mockResolvedValue(300);
    await expect(service.findAll({ page: 2, limit: 300 })).resolves.toEqual({
      data: [],
      total: 300,
      page: 2,
      limit: 300,
    });
  });

  it.each([
    ['Đạt', true],
    ['Không đạt', false],
  ])('searches the displayed result %s', async (search, expected) => {
    prisma.warehouseTemperatureHumidityChecks.findMany.mockResolvedValue([]);
    await service.findAll({ search: search as string });
    expect(
      prisma.warehouseTemperatureHumidityChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ where: { is_passed: expected } }),
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.users.findFirst.mockResolvedValue({ id: 7 });
    prisma.warehouseTemperatureHumidityChecks.findUnique.mockResolvedValue({
      id: 1,
      checked_by_id: 7,
      temperature: new Prisma.Decimal(25.5),
      humidity: new Prisma.Decimal(65.25),
    });
  });

  it('stores the authenticated checker and exact decimal measurements', async () => {
    await service.create(dto, { id: 7 });
    const calls = prisma.warehouseTemperatureHumidityChecks.create.mock
      .calls as unknown[][];
    const call = calls[0][0] as {
      data: {
        location: string;
        requirement: string;
        checked_by_id: number;
        temperature: { toString(): string };
        humidity: { toString(): string };
        is_passed: boolean;
      };
    };
    expect(call.data.location).toBe('A1');
    expect(call.data.requirement).toBe('Độ ẩm ≤ 75%');
    expect(call.data.checked_by_id).toBe(7);
    expect(call.data.temperature.toString()).toBe('25.5');
    expect(call.data.humidity.toString()).toBe('65.25');
    expect(call.data.is_passed).toBe(true);
  });

  it.each([-1, 100.01, 65.123, NaN, Infinity, null, '65'])(
    'rejects invalid humidity %s before writing',
    async (humidity) => {
      await expect(
        service.create({ ...dto, humidity } as typeof dto, { id: 7 }),
      ).rejects.toThrow(BadRequestException);
      expect(
        prisma.warehouseTemperatureHumidityChecks.create,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([-1000, 1000, 25.123, null, '25'])(
    'rejects invalid temperature %s',
    async (temperature) => {
      await expect(
        service.create({ ...dto, temperature } as typeof dto, { id: 7 }),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it.each([0, 100])('accepts humidity boundary %s', async (humidity) => {
    await service.create({ ...dto, temperature: -5.25, humidity }, { id: 7 });
    expect(prisma.warehouseTemperatureHumidityChecks.create).toHaveBeenCalled();
  });

  it('rejects missing or deleted authenticated users', async () => {
    await expect(service.create(dto)).rejects.toThrow(UnauthorizedException);
    prisma.users.findFirst.mockResolvedValue(null);
    await expect(service.create(dto, { id: 7 })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects attempts to override checker and timestamps', async () => {
    for (const field of [
      'checked_by_id',
      'created_at',
      'updated_at',
      'is_passed',
    ]) {
      await expect(
        service.create({ ...dto, [field]: 1 }, { id: 7 }),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('patches only provided measurements and preserves checker', async () => {
    await service.update(1, { humidity: 0 });
    const calls = prisma.warehouseTemperatureHumidityChecks.update.mock
      .calls as unknown[][];
    const call = calls[0][0] as {
      data: { humidity: Prisma.Decimal; is_passed: boolean };
    };
    expect(Object.keys(call.data)).toEqual(['humidity', 'is_passed']);
    expect(call.data.humidity.toString()).toBe('0');
    expect(call.data.is_passed).toBe(true);
  });

  it.each([
    [32, 80, true],
    [32.01, 80, false],
    [32, 80.01, false],
    [33, 81, false],
    [31.99, 79.99, true],
    [30, 75, true],
  ])(
    'calculates the result for temperature %s and humidity %s as %s',
    async (temperature, humidity, is_passed) => {
      await service.create({ ...dto, temperature, humidity }, { id: 7 });
      expect(
        prisma.warehouseTemperatureHumidityChecks.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_passed }),
        }),
      );
      await service.update(1, { temperature, humidity });
      expect(
        prisma.warehouseTemperatureHumidityChecks.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_passed }),
        }),
      );
    },
  );

  it.each([
    [33, 70, { humidity: 65 }, false],
    [25, 81, { temperature: 30 }, false],
    [33, 70, { temperature: 32 }, true],
    [25, 81, { humidity: 80 }, true],
  ])(
    'uses unchanged stored measurements when partially updating',
    async (temperature, humidity, patch, is_passed) => {
      prisma.warehouseTemperatureHumidityChecks.findUnique.mockResolvedValue({
        id: 1,
        checked_by_id: 7,
        temperature: new Prisma.Decimal(temperature),
        humidity: new Prisma.Decimal(humidity),
      });
      await service.update(1, patch);
      expect(
        prisma.warehouseTemperatureHumidityChecks.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_passed }),
        }),
      );
    },
  );

  it('recalculates from stored measurements on unrelated updates', async () => {
    prisma.warehouseTemperatureHumidityChecks.findUnique.mockResolvedValue({
      id: 1,
      temperature: new Prisma.Decimal(33),
      humidity: new Prisma.Decimal(70),
      is_passed: true,
    });
    await service.update(1, { location: 'A2' });
    expect(
      prisma.warehouseTemperatureHumidityChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ data: { location: 'A2', is_passed: false } }),
    );
  });

  it.each([true, false, null, 'true', 1])(
    'rejects manually supplied results %j on update',
    async (is_passed) => {
      await expect(service.update(1, { is_passed } as never)).rejects.toThrow(
        'Unknown field: is_passed',
      );
      expect(
        prisma.warehouseTemperatureHumidityChecks.update,
      ).not.toHaveBeenCalled();
    },
  );

  it('rejects empty patches and blank required fields', async () => {
    await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
    await expect(service.update(1, { location: ' ' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.update(1, { requirement: ' ' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns 404 for an unknown check and does not delete', async () => {
    prisma.warehouseTemperatureHumidityChecks.findUnique.mockResolvedValue(
      null,
    );
    await expect(service.delete(1)).rejects.toThrow(NotFoundException);
    expect(
      prisma.warehouseTemperatureHumidityChecks.delete,
    ).not.toHaveBeenCalled();
  });

  it('deletes an existing check', async () => {
    await service.delete(1);
    expect(
      prisma.warehouseTemperatureHumidityChecks.delete,
    ).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
  });
});
