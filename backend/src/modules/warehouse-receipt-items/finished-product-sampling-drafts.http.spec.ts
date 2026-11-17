import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PRODUCTION_ORDER_PERMISSIONS } from '../production-orders/production-orders.permissions';
import { FinishedProductSamplingDraftsController } from './finished-product-sampling-drafts.controller';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';
import { WarehouseReceiptSamplingSendService } from './warehouse-receipt-sampling-send.service';

describe('Finished product sampling drafts HTTP', () => {
  let app: INestApplication;
  let permissions: string[];
  const drafts = {
    findAll: jest.fn(),
    findByProductionOrder: jest.fn(),
    saveProductionOrder: jest.fn(),
  };
  const sender = { send: jest.fn() };
  const route = '/production-orders/21/sampling-request-draft';
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FinishedProductSamplingDraftsController],
      providers: [
        { provide: WarehouseReceiptSamplingDraftsService, useValue: drafts },
        { provide: WarehouseReceiptSamplingSendService, useValue: sender },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context) {
          context.switchToHttp().getRequest().user = { id: 5, permissions };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    permissions = [PRODUCTION_ORDER_PERMISSIONS.SEND_SAMPLING_REQUEST];
  });
  afterAll(async () => {
    await app.close();
  });
  it('saves only a trimmed location using authenticated creator', async () => {
    drafts.saveProductionOrder.mockResolvedValue({ id: 1 });
    await request(app.getHttpServer())
      .put(route)
      .send({ location: ' A1 ' })
      .expect(200);
    expect(drafts.saveProductionOrder).toHaveBeenCalledWith(
      21,
      { location: 'A1' },
      5,
    );
  });
  it.each([
    {},
    { location: ' ' },
    { location: 'A', created_by_id: 9 },
    { location: 'A', item_code: 'FORGED' },
  ])('rejects invalid/forged fields %p', async (body) => {
    await request(app.getHttpServer()).put(route).send(body).expect(400);
    expect(drafts.saveProductionOrder).not.toHaveBeenCalled();
  });
  it('lists only finished drafts for the authenticated user', async () => {
    drafts.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get('/finished-product-sampling-drafts?search=TP&page=2&limit=20')
      .expect(200);
    expect(drafts.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'TP', page: 2, limit: 20 }),
      5,
      'TP',
    );
  });
  it('reads the selected order for the authenticated user', async () => {
    drafts.findByProductionOrder.mockResolvedValue(null);
    await request(app.getHttpServer()).get(route).expect(200);
    expect(drafts.findByProductionOrder).toHaveBeenCalledWith(21, 5);
  });
  it('sends all own finished drafts with an idempotency key', async () => {
    const requestId = '87c9ad62-d469-44b5-bbdf-8bc074d09c74';
    sender.send.mockResolvedValue({ status: 'success', sentCount: 2 });
    await request(app.getHttpServer())
      .post('/finished-product-sampling-drafts/send')
      .send({ requestId })
      .expect(201);
    expect(sender.send).toHaveBeenCalledWith(requestId, 5, 'TP');
  });
  it.each(['get', 'put'] as const)(
    'requires send permission for draft %s',
    async (method) => {
      permissions = [];
      await request(app.getHttpServer())
        [method](route)
        .send({ location: 'A' })
        .expect(403);
      expect(drafts.saveProductionOrder).not.toHaveBeenCalled();
      expect(drafts.findByProductionOrder).not.toHaveBeenCalled();
    },
  );
  it('requires send permission for batch send', async () => {
    permissions = [];
    await request(app.getHttpServer())
      .post('/finished-product-sampling-drafts/send')
      .send({ requestId: '87c9ad62-d469-44b5-bbdf-8bc074d09c74' })
      .expect(403);
    expect(sender.send).not.toHaveBeenCalled();
  });
});
