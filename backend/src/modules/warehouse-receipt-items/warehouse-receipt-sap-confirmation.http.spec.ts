import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';

describe('Warehouse receipt SAP confirmation HTTP', () => {
  let app: INestApplication;
  let authenticated = true;
  const service = { confirmSap: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WarehouseReceiptItemsController],
      providers: [{ provide: WarehouseReceiptItemsService, useValue: service }],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context) {
          context.switchToHttp().getRequest().user = {
            id: 5,
            permissions: ['warehouse-receipt-items.read-all'],
          };
          return authenticated;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    authenticated = true;
  });
  afterAll(async () => {
    await app.close();
  });
  it('confirms using the session user and ignores forged audit fields', async () => {
    service.confirmSap.mockResolvedValue({ id: 1, confirmed_by_id: 5 });
    await request(app.getHttpServer())
      .post('/warehouse-receipt-items/2/sap-confirmation')
      .send({
        confirmed_by_id: 99,
        confirmed_at: '2000-01-01',
        warehouse_receipt_item_id: 77,
      })
      .expect(201, { id: 1, confirmed_by_id: 5 });
    expect(service.confirmSap).toHaveBeenCalledWith(2, 5);
  });
  it('requires authentication', async () => {
    authenticated = false;
    await request(app.getHttpServer())
      .post('/warehouse-receipt-items/2/sap-confirmation')
      .expect(403);
    expect(service.confirmSap).not.toHaveBeenCalled();
  });
  it('rejects invalid receipt identifiers', async () => {
    await request(app.getHttpServer())
      .post('/warehouse-receipt-items/bad/sap-confirmation')
      .expect(400);
    expect(service.confirmSap).not.toHaveBeenCalled();
  });
});
