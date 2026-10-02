import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WarehouseTemperatureHumidityChecksService } from './warehouse-temperature-humidity-checks.service';

describe('WarehouseTemperatureHumidityChecksService', () => {
  const prisma = {
    warehouseTemperatureHumidityChecks: {
      findMany: jest.fn(),
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
    is_passed: true,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.users.findFirst.mockResolvedValue({ id: 7 });
    prisma.warehouseTemperatureHumidityChecks.findUnique.mockResolvedValue({
      id: 1,
      checked_by_id: 7,
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
    for (const field of ['checked_by_id', 'created_at', 'updated_at']) {
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
      data: Record<string, { toString(): string }>;
    };
    expect(Object.keys(call.data)).toEqual(['humidity']);
    expect(call.data.humidity.toString()).toBe('0');
  });

  it.each([true, false])('stores the check result %s', async (is_passed) => {
    await service.create({ ...dto, is_passed }, { id: 7 });
    expect(
      prisma.warehouseTemperatureHumidityChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ is_passed }),
      }),
    );
    await service.update(1, { is_passed });
    expect(
      prisma.warehouseTemperatureHumidityChecks.update,
    ).toHaveBeenCalledWith(expect.objectContaining({ data: { is_passed } }));
  });

  it.each([null, 'true', 'false', 0, 1, '', undefined])(
    'rejects an invalid or missing result %s on create',
    async (is_passed) => {
      await expect(
        service.create({ ...dto, is_passed } as typeof dto, { id: 7 }),
      ).rejects.toThrow(BadRequestException);
      expect(
        prisma.warehouseTemperatureHumidityChecks.create,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([null, 'true', 'false', 0, 1, ''])(
    'rejects an invalid result %s on update',
    async (is_passed) => {
      await expect(
        service.update(1, { is_passed } as Partial<typeof dto>),
      ).rejects.toThrow(BadRequestException);
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
