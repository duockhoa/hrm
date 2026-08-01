import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersAuthService } from './registration-numbers-auth.service';
import { RegistrationNumbersSyncService } from './registration-numbers-sync.service';

jest.mock('axios');

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

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
    mockedAxiosGet.mockReset();
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
    mockedAxiosGet.mockResolvedValue({
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

    expect(mockedAxiosGet).toHaveBeenCalledWith(
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
          id: 583,
        },
        update: {
          registration_number: '723/26/CBMP-PT',
          product_name: 'Muối kiềm',
          deleted_at: null,
        },
        create: {
          id: 583,
          registration_number: '723/26/CBMP-PT',
          product_name: 'Muối kiềm',
        },
      },
    );
    expect(prismaService.registrationNumbers.upsert).toHaveBeenNthCalledWith(
      2,
      {
        where: {
          id: 584,
        },
        update: {
          registration_number: '724/26/CBMP-PT',
          product_name: 'Viên nang mềm',
          deleted_at: null,
        },
        create: {
          id: 584,
          registration_number: '724/26/CBMP-PT',
          product_name: 'Viên nang mềm',
        },
      },
    );
  });

  it('updates existing registration number when local id is different', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken.mockResolvedValue('scb-token');
    mockedAxiosGet.mockResolvedValue({
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
        id: 583,
        product_name: 'Muối kiềm',
        deleted_at: null,
      },
    });
    expect(prismaService.registrationNumbers.upsert).not.toHaveBeenCalled();
  });

  it('skips registration numbers sync when access token cannot be fetched', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken.mockResolvedValue(null);

    await service.handleCronSyncRegistrationNumbers();

    expect(mockedAxiosGet).not.toHaveBeenCalled();
    expect(prismaService.registrationNumbers.upsert).not.toHaveBeenCalled();
  });

  it('skips registration numbers sync when SCB API URL is missing', async () => {
    delete process.env.SCB_REGISTRATION_NUMBERS_API_URL;

    await service.handleCronSyncRegistrationNumbers();

    expect(mockedAxiosGet).not.toHaveBeenCalled();
    expect(prismaService.registrationNumbers.upsert).not.toHaveBeenCalled();
  });

  it('refreshes access token once when SCB API returns unauthorized', async () => {
    process.env.SCB_REGISTRATION_NUMBERS_API_URL =
      'https://scb.example.test/api/ho-so';
    authService.getAccessToken
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');
    mockedAxiosGet
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
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
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
