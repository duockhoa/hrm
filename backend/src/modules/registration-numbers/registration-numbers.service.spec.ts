import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersService } from './registration-numbers.service';

describe('RegistrationNumbersService', () => {
  let service: RegistrationNumbersService;
  let prismaService: {
    registrationNumbers: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationNumbersService,
        {
          provide: PrismaService,
          useValue: {
            registrationNumbers: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RegistrationNumbersService>(
      RegistrationNumbersService,
    );
    prismaService = module.get(PrismaService);
  });

  it('returns registration numbers filtered by search', async () => {
    prismaService.registrationNumbers.findMany.mockResolvedValue([
      {
        id: 583,
        registration_number: '723/26/CBMP-PT',
        product_name: 'Muối kiềm',
      },
    ]);

    await expect(
      service.findAll({
        search: '723',
      }),
    ).resolves.toEqual([
      {
        id: 583,
        registration_number: '723/26/CBMP-PT',
        product_name: 'Muối kiềm',
      },
    ]);

    expect(prismaService.registrationNumbers.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        registration_number: {
          contains: '723',
        },
      },
      select: {
        id: true,
        registration_number: true,
        product_name: true,
      },
      orderBy: [{ id: 'asc' }],
    });
  });

  it('returns all registration numbers without search', async () => {
    prismaService.registrationNumbers.findMany.mockResolvedValue([
      {
        id: 583,
        registration_number: '723/26/CBMP-PT',
        product_name: 'Muối kiềm',
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 583,
        registration_number: '723/26/CBMP-PT',
        product_name: 'Muối kiềm',
      },
    ]);

    expect(prismaService.registrationNumbers.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        registration_number: true,
        product_name: true,
      },
      orderBy: [{ id: 'asc' }],
    });
  });

  it('rejects invalid search', async () => {
    await expect(service.findAll({ search: 123 as any })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
