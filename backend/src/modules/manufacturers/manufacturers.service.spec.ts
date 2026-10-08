import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Prisma } from '@prisma/client';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { PrismaService } from 'src/prisma.service';
import { ManufacturersController } from './manufacturers.controller';
import { ManufacturersService } from './manufacturers.service';

describe('Manufacturers', () => {
  const manufacturers = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const sequence = { update: jest.fn() };
  const transaction = jest.fn();
  let service: ManufacturersService;
  const dto = { manufacturer_name: 'Nhà sản xuất A' };
  const user = { id: 7 };
  const include = {
    createdBy: { select: { id: true, username: true, name: true } },
  };
  const record = {
    id: 1,
    manufacturer_code: 'NSX0001',
    ...dto,
    created_by_id: 7,
    createdBy: { id: 7, username: 'user7', name: 'Người thêm' },
  };
  const databaseError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('Database error', {
      code,
      clientVersion: '6.19.1',
    });

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation(
      (
        callback: (tx: {
          manufacturers: typeof manufacturers;
          manufacturerCodeSequence: typeof sequence;
        }) => Promise<unknown>,
      ) => callback({ manufacturers, manufacturerCodeSequence: sequence }),
    );
    sequence.update.mockResolvedValue({ id: 1, last_number: 1 });
    manufacturers.create.mockResolvedValue(record);
    service = new ManufacturersService({
      manufacturers,
      $transaction: transaction,
    } as unknown as PrismaService);
  });

  it('requires login without permissions on any endpoint', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ManufacturersController),
    ).toEqual([jwtAuthGuard]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, ManufacturersController),
    ).toBeUndefined();
    for (const method of [
      'findAll',
      'findById',
      'create',
      'update',
      'delete',
    ] as const) {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          Object.getOwnPropertyDescriptor(
            ManufacturersController.prototype,
            method,
          )!.value as object,
        ),
      ).toBeUndefined();
    }
  });

  it('creates NSX0001 with the authenticated creator and trimmed name', async () => {
    await expect(
      service.create({ manufacturer_name: ' Nhà sản xuất A ' }, user),
    ).resolves.toEqual(record);
    expect(sequence.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { last_number: { increment: 1 } },
    });
    expect(manufacturers.create).toHaveBeenCalledWith({
      data: { ...dto, manufacturer_code: 'NSX0001', created_by_id: 7 },
      include,
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    [2, 'NSX0002'],
    [10, 'NSX0010'],
    [9999, 'NSX9999'],
    [10000, 'NSX10000'],
  ])('formats sequence %s as %s', async (last_number, code) => {
    sequence.update.mockResolvedValue({ last_number });
    await service.create(dto, user);
    expect(manufacturers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...dto, manufacturer_code: code, created_by_id: 7 },
      }),
    );
  });

  it('ignores caller-supplied code and creator', async () => {
    await service.create(
      { ...dto, manufacturer_code: 'CUSTOM', created_by_id: 999 } as typeof dto,
      user,
    );
    expect(manufacturers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...dto, manufacturer_code: 'NSX0001', created_by_id: 7 },
      }),
    );
  });

  it('passes the logged-in user from the controller', async () => {
    const create = jest.fn();
    const controller = new ManufacturersController({
      create,
    } as unknown as ManufacturersService);
    await controller.create(dto, { user });
    expect(create).toHaveBeenCalledWith(dto, user);
  });

  it('retries a transaction deadlock', async () => {
    transaction.mockRejectedValueOnce(databaseError('P2034'));
    await expect(service.create(dto, user)).resolves.toEqual(record);
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('stops retrying after three failed transactions', async () => {
    transaction.mockRejectedValue(databaseError('P2034'));
    await expect(service.create(dto, user)).rejects.toMatchObject({
      code: 'P2034',
    });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it.each(['', ' ', 'A'.repeat(256), null, 123])(
    'rejects invalid names: %s',
    async (name) => {
      await expect(
        service.create({ manufacturer_name: name } as typeof dto, user),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, { id: null }, { id: 0 }, { id: -1 }, { id: 'bad' }])(
    'rejects invalid creators: %j',
    async (invalidUser) => {
      await expect(service.create(dto, invalidUser)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('includes creator information in list and detail responses', async () => {
    manufacturers.findMany.mockResolvedValue([record]);
    manufacturers.findUnique.mockResolvedValue(record);
    await expect(service.findAll()).resolves.toEqual([record]);
    await expect(service.findById(1)).resolves.toEqual(record);
    expect(manufacturers.findMany).toHaveBeenCalledWith({
      orderBy: { manufacturer_code: 'asc' },
      include,
    });
    expect(manufacturers.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include,
    });
  });

  it('updates the name while preserving code and creator', async () => {
    manufacturers.findUnique.mockResolvedValue(record);
    await service.update(1, {
      manufacturer_name: ' Tên mới ',
      manufacturer_code: 'CUSTOM',
      created_by_id: 999,
    } as typeof dto);
    expect(manufacturers.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { manufacturer_name: 'Tên mới' },
      include,
    });
  });

  it.each([{}, { manufacturer_name: null }, { manufacturer_name: ' ' }])(
    'rejects invalid updates: %j',
    async (invalidDto) => {
      manufacturers.findUnique.mockResolvedValue(record);
      await expect(service.update(1, invalidDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(manufacturers.update).not.toHaveBeenCalled();
    },
  );

  it('returns not found for missing records', async () => {
    manufacturers.findUnique.mockResolvedValue(null);
    manufacturers.delete.mockRejectedValue(databaseError('P2025'));
    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(1, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.delete(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not reset the sequence when a manufacturer is deleted', async () => {
    manufacturers.delete.mockResolvedValue(record);
    await expect(service.delete(1)).resolves.toEqual(record);
    expect(transaction).not.toHaveBeenCalled();
    expect(sequence.update).not.toHaveBeenCalled();
    expect(manufacturers.delete).toHaveBeenCalledWith({
      where: { id: 1 },
      include,
    });
  });
});
