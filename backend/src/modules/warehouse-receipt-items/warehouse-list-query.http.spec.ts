import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';
import { WarehouseTemperatureHumidityChecksController } from '../warehouse-temperature-humidity-checks/warehouse-temperature-humidity-checks.controller';
import { WarehouseTemperatureHumidityChecksService } from '../warehouse-temperature-humidity-checks/warehouse-temperature-humidity-checks.service';

describe.each([
  [
    'warehouse-receipt-items',
    WarehouseReceiptItemsController,
    WarehouseReceiptItemsService,
  ],
  [
    'warehouse-temperature-humidity-checks',
    WarehouseTemperatureHumidityChecksController,
    WarehouseTemperatureHumidityChecksService,
  ],
] as const)('%s list query', (route, controller, service) => {
  let app: INestApplication;
  const findAll = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [controller],
      providers: [{ provide: service, useValue: { findAll } }],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => findAll.mockReset());
  afterAll(async () => {
    await app.close();
  });

  it('transforms pagination and trims the server search', async () => {
    const page = { data: [], total: 0, page: 2, limit: 300 };
    findAll.mockResolvedValue(page);
    const response = await request(app.getHttpServer())
      .get(`/${route}`)
      .query({
        page: '2',
        limit: '300',
        search: '  Kho A  ',
        item_code: ' BB01447 ',
      })
      .expect(200);
    expect(response.body).toEqual(page);
    expect(findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 300,
        search: 'Kho A',
        item_code: 'BB01447',
      }),
    );
  });

  it.each(['page=0', 'page=1.5', 'limit=301', 'limit=-1', 'limit=abc'])(
    'rejects invalid query %s before querying data',
    async (query) => {
      await request(app.getHttpServer()).get(`/${route}?${query}`).expect(400);
      expect(findAll).not.toHaveBeenCalled();
    },
  );
});
