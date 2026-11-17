import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { WarehouseReceiptSamplingDraftsController } from './warehouse-receipt-sampling-drafts.controller';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';
import { WarehouseReceiptSamplingSendService } from './warehouse-receipt-sampling-send.service';

describe('Receipt sampling draft endpoints', () => {
  let app: INestApplication;
  const service = {
    save: jest.fn(),
    findAll: jest.fn(),
    findByReceipt: jest.fn(),
  };
  const sendService = { send: jest.fn() };
  const route = '/warehouse-receipt-items/2/sampling-request-draft';
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WarehouseReceiptSamplingDraftsController],
      providers: [
        { provide: WarehouseReceiptSamplingSendService, useValue: sendService },
        { provide: WarehouseReceiptSamplingDraftsService, useValue: service },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user: { id: number } } };
        }) => {
          context.switchToHttp().getRequest().user = { id: 5 };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => jest.resetAllMocks());
  it('sends using the authenticated sender and an idempotency key', async () => {
    sendService.send.mockResolvedValue({ status: 'success', sentCount: 2 });
    const requestId = '87c9ad62-d469-44b5-bbdf-8bc074d09c74';
    await request(app.getHttpServer())
      .post('/warehouse-receipt-sampling-drafts/send')
      .send({ requestId })
      .expect(201);
    expect(sendService.send).toHaveBeenCalledWith(requestId, 5);
  });
  it.each([
    {},
    { requestId: 'bad' },
    { requestId: '87c9ad62-d469-44b5-bbdf-8bc074d09c74', sender_id: 999 },
  ])('rejects invalid send request %p', async (body) => {
    await request(app.getHttpServer())
      .post('/warehouse-receipt-sampling-drafts/send')
      .send(body)
      .expect(400);
    expect(sendService.send).not.toHaveBeenCalled();
  });
  afterAll(async () => {
    await app.close();
  });

  it('requires authentication like the receipt endpoints', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        WarehouseReceiptSamplingDraftsController,
      ),
    ).toContain(jwtAuthGuard);
  });
  it('saves only a trimmed location for the selected receipt', async () => {
    service.save.mockResolvedValue({ id: 1 });
    await request(app.getHttpServer())
      .put(route)
      .send({ location: '  Warehouse A  ' })
      .expect(200);
    expect(service.save).toHaveBeenCalledWith(
      2,
      { location: 'Warehouse A' },
      5,
    );
  });
  it.each([
    {},
    { location: '' },
    { location: '   ' },
    { location: null },
    { location: 12 },
    { location: 'a'.repeat(192) },
    { location: 'A', item_code: 'FORGED' },
    { location: 'A', warehouse_receipt_item_id: 3 },
    { location: 'A', created_by_id: 6 },
  ])('rejects invalid or forged body %p', async (body) => {
    await request(app.getHttpServer()).put(route).send(body).expect(400);
    expect(service.save).not.toHaveBeenCalled();
  });
  it('gets the draft of one receipt', async () => {
    service.findByReceipt.mockResolvedValue({ id: 1 });
    await request(app.getHttpServer()).get(route).expect(200, { id: 1 });
    expect(service.findByReceipt).toHaveBeenCalledWith(2, 5);
  });
  it('transforms search pagination', async () => {
    service.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 300,
    });
    await request(app.getHttpServer())
      .get('/warehouse-receipt-sampling-drafts')
      .query({ page: '2', limit: '300', search: ' A ' })
      .expect(200);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 300, search: 'A' }),
      5,
    );
  });
  it('rejects invalid pagination', async () => {
    await request(app.getHttpServer())
      .get('/warehouse-receipt-sampling-drafts?limit=301')
      .expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });
  it('ignores a forged owner query and uses the authenticated user', async () => {
    service.findAll.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get('/warehouse-receipt-sampling-drafts?created_by_id=6&userId=6')
      .expect(200);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.not.objectContaining({ created_by_id: 6 }),
      5,
    );
  });
});
