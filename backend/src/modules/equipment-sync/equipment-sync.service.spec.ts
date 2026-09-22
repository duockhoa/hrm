import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { RegistrationNumbersAuthService } from '../registration-numbers-sync/registration-numbers-auth.service';
import { EquipmentSyncService } from './equipment-sync.service';

jest.mock('axios');

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe('EquipmentSyncService', () => {
  let service: EquipmentSyncService;
  let prismaService: {
    equipment: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let transactionEquipment: {
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  let authService: {
    getAccessToken: jest.Mock;
    clearAccessToken: jest.Mock;
  };
  const originalEnv = process.env;

  beforeEach(async () => {
    mockedAxiosGet.mockReset();
    process.env = { ...originalEnv };
    process.env.QLTB_EQUIPMENT_API_URL =
      'https://qltb.example.test/api/v1/equipment';
    process.env.QLTB_EQUIPMENT_SYNC_CREATED_BY_ID = '7';
    process.env.QLTB_EQUIPMENT_SYNC_LIMIT = '10000';

    transactionEquipment = {
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    };
    prismaService = {
      equipment: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback) =>
        callback({
          equipment: transactionEquipment,
        }),
      ),
    };
    authService = {
      getAccessToken: jest.fn().mockResolvedValue('qltb-token'),
      clearAccessToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentSyncService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: RegistrationNumbersAuthService,
          useValue: authService,
        },
      ],
    }).compile();

    service = module.get<EquipmentSyncService>(EquipmentSyncService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates missing equipment, updates names by code, and deletes absent equipment', async () => {
    mockedAxiosGet.mockResolvedValue({
      data: {
        data: [
          { code: ' TBSX001 ', name: ' Hệ thống RO ' },
          { code: 'TBSX002', name: 'Máy rửa lọ' },
          { code: 'TBSX003', name: 'Nồi hấp' },
        ],
      },
    });
    prismaService.equipment.findMany.mockResolvedValue([
      { id: 1, code: 'TBSX001', name: 'Hệ thống RO' },
      { id: 2, code: 'TBSX002', name: 'Tên cũ' },
      { id: 3, code: 'TBSX004', name: 'Thiết bị bị xoá' },
    ]);

    await service.handleCronSyncEquipment();

    expect(mockedAxiosGet).toHaveBeenCalledWith(
      'https://qltb.example.test/api/v1/equipment',
      {
        params: { page: 1, limit: 10000 },
        headers: { Authorization: 'Bearer qltb-token' },
      },
    );
    expect(transactionEquipment.create).toHaveBeenCalledWith({
      data: {
        code: 'TBSX003',
        name: 'Nồi hấp',
        created_by_id: 7,
      },
    });
    expect(transactionEquipment.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { name: 'Máy rửa lọ' },
    });
    expect(transactionEquipment.deleteMany).toHaveBeenCalledWith({
      where: {
        code: { in: ['TBSX004'] },
      },
    });
  });

  it('does not change local equipment when API returns no usable code', async () => {
    mockedAxiosGet.mockResolvedValue({
      data: {
        data: [{ code: null, name: 'Không có mã' }],
      },
    });

    await service.handleCronSyncEquipment();

    expect(prismaService.equipment.findMany).not.toHaveBeenCalled();
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('does not change local equipment when the response has no equipment list', async () => {
    mockedAxiosGet.mockResolvedValue({ data: { success: true } });

    await service.handleCronSyncEquipment();

    expect(prismaService.equipment.findMany).not.toHaveBeenCalled();
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('does not delete equipment from a possibly truncated API response', async () => {
    process.env.QLTB_EQUIPMENT_SYNC_LIMIT = '2';
    mockedAxiosGet.mockResolvedValue({
      data: {
        data: [
          { code: 'TBSX001', name: 'Thiết bị 1' },
          { code: 'TBSX002', name: 'Thiết bị 2' },
        ],
      },
    });

    await service.handleCronSyncEquipment();

    expect(prismaService.equipment.findMany).not.toHaveBeenCalled();
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('does not make database changes when the API request fails', async () => {
    mockedAxiosGet.mockRejectedValue(new Error('Unauthorized'));

    await service.handleCronSyncEquipment();

    expect(prismaService.equipment.findMany).not.toHaveBeenCalled();
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('refreshes the token once when the API returns unauthorized', async () => {
    authService.getAccessToken
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');
    mockedAxiosGet
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({ data: { data: [] } });
    prismaService.equipment.findMany.mockResolvedValue([]);

    await service.handleCronSyncEquipment();

    expect(authService.clearAccessToken).toHaveBeenCalledTimes(1);
    expect(authService.getAccessToken).toHaveBeenNthCalledWith(1);
    expect(authService.getAccessToken).toHaveBeenNthCalledWith(2, true);
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      2,
      'https://qltb.example.test/api/v1/equipment',
      {
        params: { page: 1, limit: 10000 },
        headers: { Authorization: 'Bearer fresh-token' },
      },
    );
  });
});
