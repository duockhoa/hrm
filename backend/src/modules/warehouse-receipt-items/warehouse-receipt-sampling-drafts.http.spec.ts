import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { WarehouseReceiptSamplingDraftsController } from './warehouse-receipt-sampling-drafts.controller';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';

describe('Receipt sampling draft endpoints', () => {
  let app: INestApplication;
  const service = {
    save: jest.fn(),
    findAll: jest.fn(),
    findByReceipt: jest.fn(),
  };
  const route = '/warehouse-receipt-items/2/sampling-request-draft';
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WarehouseReceiptSamplingDraftsController],
      providers: [
        { provide: WarehouseReceiptSamplingDraftsService, useValue: service },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => jest.resetAllMocks());
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
    expect(service.save).toHaveBeenCalledWith(2, { location: 'Warehouse A' });
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
  ])('rejects invalid or forged body %p', async (body) => {
    await request(app.getHttpServer()).put(route).send(body).expect(400);
    expect(service.save).not.toHaveBeenCalled();
  });
  it('gets the draft of one receipt', async () => {
    service.findByReceipt.mockResolvedValue({ id: 1 });
    await request(app.getHttpServer()).get(route).expect(200, { id: 1 });
    expect(service.findByReceipt).toHaveBeenCalledWith(2);
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
    );
  });
  it('rejects invalid pagination', async () => {
    await request(app.getHttpServer())
      .get('/warehouse-receipt-sampling-drafts?limit=301')
      .expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });
});
