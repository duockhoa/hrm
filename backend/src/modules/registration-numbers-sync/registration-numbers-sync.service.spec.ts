/* eslint-disable @typescript-eslint/unbound-method -- Jest assertions inspect mocked methods without invoking them. */
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersAuthService } from './registration-numbers-auth.service';
import { RegistrationNumbersSyncService } from './registration-numbers-sync.service';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

describe('RegistrationNumbersSyncService', () => {
  let service: RegistrationNumbersSyncService;
  let prismaService: {
    registrationNumbers: {
      findUnique: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let authService: {
    getAccessToken: jest.Mock;
    clearAccessToken: jest.Mock;
  };
  const originalEnv = process.env;

  beforeEach(async () => {
    mockedAxios.get.mockReset();
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationNumbersSyncService,
        {
          provide: RegistrationNumbersAuthService,
          useValue: {
            getAccessToken: jest.fn(),
            clearAccessToken: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            registrationNumbers: {
              findUnique: jest.fn(),
              update: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RegistrationNumbersSyncService>(
      RegistrationNumbersSyncService,
    );
    prismaService = module.get(PrismaService);
    authService = module.get(RegistrationNumbersAuthService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('syncs registration numbers from SCB API', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken.mockResolvedValue('scb-token');
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          total: 2,
          page: 1,
          limit: 5000,
          data: [
            {
              id: 583,
              ma_ho_so: '723/26/CBMP-PT',
              ten_san_pham: 'Muối kiềm',
            },
            {
              id: '584',
              ma_ho_so: ' 724/26/CBMP-PT ',
              ten_san_pham: ' Viên nang mềm ',
            },
            {
              id: null,
              ma_ho_so: 'INVALID',
            },
          ],
        },
      },
    });
    prismaService.registrationNumbers.upsert.mockResolvedValue({});
    prismaService.registrationNumbers.findUnique.mockResolvedValue(null);

    await service.handleCronSyncRegistrationNumbers();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://scb.example.test/api/ho-so',
      {
        params: {
          limit: 5000,
        },
        headers: {
          Authorization: 'Bearer scb-token',
        },
      },
    );
    expect(prismaService.registrationNumbers.findUnique).toHaveBeenCalledTimes(
      2,
    );
    expect(prismaService.registrationNumbers.upsert).toHaveBeenCalledTimes(2);
    expect(prismaService.registrationNumbers.upsert).toHaveBeenNthCalledWith(
      1,
      {
        where: {
          registration_number: '723/26/CBMP-PT',
        },
        update: {
          product_name: 'Muối kiềm',
          deleted_at: null,
        },
        create: {
          registration_number: '723/26/CBMP-PT',
          product_name: 'Muối kiềm',
        },
      },
    );
    expect(prismaService.registrationNumbers.upsert).toHaveBeenNthCalledWith(
      2,
      {
        where: {
          registration_number: '724/26/CBMP-PT',
        },
        update: {
          product_name: 'Viên nang mềm',
          deleted_at: null,
        },
        create: {
          registration_number: '724/26/CBMP-PT',
          product_name: 'Viên nang mềm',
        },
      },
    );
  });

  it('updates product information without replacing the local id', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken.mockResolvedValue('scb-token');
    mockedAxios.get.mockResolvedValue({
      data: {
        data: {
          data: [
            {
              id: 583,
              ma_ho_so: '723/26/CBMP-PT',
              ten_san_pham: 'Muối kiềm',
            },
          ],
        },
      },
    });
    prismaService.registrationNumbers.findUnique.mockResolvedValue({
      id: 1,
    });
    prismaService.registrationNumbers.update.mockResolvedValue({});

    await service.handleCronSyncRegistrationNumbers();

    expect(prismaService.registrationNumbers.update).toHaveBeenCalledWith({
      where: {
        registration_number: '723/26/CBMP-PT',
      },
      data: {
        product_name: 'Muối kiềm',
        deleted_at: null,
      },
    });
    expect(prismaService.registrationNumbers.upsert).not.toHaveBeenCalled();
  });

  it('groups shared numbers and remains unchanged across repeated, reordered syncs', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken.mockResolvedValue('scb-token');
    const records = [
      { id: 410, ma_ho_so: 'REG-1', ten_san_pham: 'Sản phẩm B' },
      { id: 574, ma_ho_so: ' REG-1 ', ten_san_pham: ' Sản phẩm A ' },
      { id: 575, ma_ho_so: 'REG-1', ten_san_pham: 'Sản phẩm A' },
      { id: 576, ma_ho_so: 'REG-1', ten_san_pham: null },
    ];
    mockedAxios.get.mockResolvedValue({ data: records });
    const local = { id: 410, product_name: 'Sản phẩm B', deleted_at: null };
    prismaService.registrationNumbers.findUnique.mockImplementation(() => ({
      ...local,
    }));
    prismaService.registrationNumbers.update.mockImplementation(({ data }) => {
      Object.assign(local, data);
      return { ...local };
    });

    await service.handleCronSyncRegistrationNumbers();
    mockedAxios.get.mockResolvedValue({ data: [...records].reverse() });
    await service.handleCronSyncRegistrationNumbers();
    await service.handleCronSyncRegistrationNumbers();

    expect(local).toEqual({
      id: 410,
      product_name: 'Sản phẩm A; Sản phẩm B',
      deleted_at: null,
    });
    expect(prismaService.registrationNumbers.update).toHaveBeenCalledTimes(1);
    expect(prismaService.registrationNumbers.upsert).not.toHaveBeenCalled();
  });

  it('creates one local registration for shared source numbers without copying source IDs', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken.mockResolvedValue('scb-token');
    mockedAxios.get.mockResolvedValue({
      data: [
        { id: 410, ma_ho_so: 'REG-1', ten_san_pham: 'B' },
        { id: 574, ma_ho_so: 'REG-1', ten_san_pham: 'A' },
      ],
    });
    prismaService.registrationNumbers.findUnique.mockResolvedValue(null);

    await service.handleCronSyncRegistrationNumbers();

    expect(prismaService.registrationNumbers.upsert).toHaveBeenCalledTimes(1);
    expect(prismaService.registrationNumbers.upsert).toHaveBeenCalledWith({
      where: { registration_number: 'REG-1' },
      create: { registration_number: 'REG-1', product_name: 'A; B' },
      update: { product_name: 'A; B', deleted_at: null },
    });
  });

  it('restores a deleted registration while preserving its local ID', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken.mockResolvedValue('scb-token');
    mockedAxios.get.mockResolvedValue({
      data: [{ id: 574, ma_ho_so: 'REG-1', ten_san_pham: null }],
    });
    prismaService.registrationNumbers.findUnique.mockResolvedValue({
      product_name: null,
      deleted_at: new Date('2026-10-30'),
    });

    await service.handleCronSyncRegistrationNumbers();

    expect(prismaService.registrationNumbers.update).toHaveBeenCalledWith({
      where: { registration_number: 'REG-1' },
      data: { product_name: null, deleted_at: null },
    });
  });

  it('skips registration numbers sync when access token cannot be fetched', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken.mockResolvedValue(null);

    await service.handleCronSyncRegistrationNumbers();

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(prismaService.registrationNumbers.upsert).not.toHaveBeenCalled();
  });

  it('skips registration numbers sync when SCB API URL is missing', async () => {
    delete process.env.SCB_REGISTRATION_NUMBERS_API_URL;

    await service.handleCronSyncRegistrationNumbers();

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(prismaService.registrationNumbers.upsert).not.toHaveBeenCalled();
  });

  it('refreshes access token once when SCB API returns unauthorized', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');
    mockedAxios.get
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 401,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            data: [],
          },
        },
      });

    await service.handleCronSyncRegistrationNumbers();

    expect(authService.clearAccessToken).toHaveBeenCalledTimes(1);
    expect(authService.getAccessToken).toHaveBeenNthCalledWith(1);
    expect(authService.getAccessToken).toHaveBeenNthCalledWith(2, true);
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      2,
      'https://scb.example.test/api/ho-so',
      {
        params: {
          limit: 5000,
        },
        headers: {
          Authorization: 'Bearer fresh-token',
        },
      },
    );
  });
});
