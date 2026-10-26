import { ProductionOrderWeighingRecordsGateway } from './production-order-weighing-records.gateway';
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';
import {
  removeUploadedProductionOrderWeighingRecordLotCheckImage,
  resolveProductionOrderWeighingRecordLotCheckImageFile,
} from './production-order-weighing-record-lot-check-upload.config';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import {
  ProductionOrderWeighingRecordLinesController,
  ProductionOrderWeighingLotCheckImagesController,
} from './production-order-weighing-record-lines.controller';
import { ProductionOrderWeighingRecordLinesService } from './production-order-weighing-record-lines.service';

describe('Weighing record line HTTP routes', () => {
  let app: INestApplication;
  const service = Object.fromEntries(
    [
      'findAll',
      'findById',
      'create',
      'update',
      'delete',
      'checkLot',
      'deleteLotCheckImage',
      'findLotCheckImage',
    ].map((method) => [method, jest.fn().mockResolvedValue({ id: 7 })]),
  );
  const base = '/production-orders/weighing-records/3/lines';
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        ProductionOrderWeighingRecordLinesController,
        ProductionOrderWeighingLotCheckImagesController,
      ],
      providers: [
        {
          provide: ProductionOrderWeighingRecordsGateway,
          useValue: { notifyMutation: jest.fn() },
        },
        PermissionsGuard,
        {
          provide: ProductionOrderWeighingRecordLinesService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = { id: 9, permissions: [req.headers['x-test-permission']] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

  it('allows lot checking without a permission while requiring login', async () => {
    const body = { lot_no: 'LOT01', is_correct: false };
    await request(app.getHttpServer())
      .patch(base + '/7/lot-check')
      .send(body)
      .expect(401);
    await request(app.getHttpServer())
      .patch(base + '/7/lot-check')
      .set('Authorization', 'test')
      .send(body)
      .expect(200);
    expect(service.checkLot).toHaveBeenCalledWith(
      3,
      7,
      body,
      expect.objectContaining({ id: 9 }),
      [],
    );
  });

  it('accepts multiple images and transforms multipart false to a boolean without a permission', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    let uploaded: Express.Multer.File[] = [];
    service.checkLot.mockImplementationOnce(async (...args) => {
      uploaded = args[4];
      return { id: 1 };
    });
    try {
      await request(app.getHttpServer())
        .patch(base + '/7/lot-check')
        .set('Authorization', 'test')
        .field('lot_no', 'LOT01')
        .field('is_correct', 'false')
        .attach('images', png, 'lot-check-test-a.png')
        .attach('images', png, 'lot-check-test-b.png')
        .expect(200);
      expect(uploaded).toHaveLength(2);
      expect(service.checkLot.mock.calls[0][2]).toMatchObject({
        is_correct: false,
        lot_no: 'LOT01',
      });
      const imageUrl = `/production-orders/weighing-record-lot-checks/images/${uploaded[0].filename}`;
      await request(app.getHttpServer()).get(imageUrl).expect(401);
      service.findLotCheckImage.mockImplementationOnce((filename, original) =>
        resolveProductionOrderWeighingRecordLotCheckImageFile(
          filename,
          original,
        ),
      );
      await request(app.getHttpServer())
        .get(imageUrl + '?original=true')
        .set('Authorization', 'test')
        .expect('Content-Type', /image\/png/)
        .expect('Cache-Control', 'private, no-store')
        .expect(200);
      expect(service.findLotCheckImage).toHaveBeenCalledWith(
        uploaded[0].filename,
        true,
      );
    } finally {
      await Promise.all(
        uploaded.map(removeUploadedProductionOrderWeighingRecordLotCheckImage),
      );
    }
  });

  it('cleans uploaded files when the route id or body is invalid', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    for (const [lineId, result] of [
      ['bad-id', 'true'],
      ['7', 'invalid'],
    ]) {
      await request(app.getHttpServer())
        .patch(base + `/${lineId}/lot-check`)
        .set('Authorization', 'test')
        .field('lot_no', 'LOT01')
        .field('is_correct', result)
        .attach('images', png, 'lot-check-invalid-test.png')
        .expect(400);
    }
    expect(service.checkLot).not.toHaveBeenCalled();
    const files = await readdir(
      join(
        process.cwd(),
        'uploads',
        'production-order-weighing-record-lot-checks',
        'images',
      ),
    );
    expect(
      files.filter((name) => name.startsWith('lot-check-invalid-test')),
    ).toEqual([]);
  });

  it('allows deleting a lot-check image without a specific permission', async () => {
    await request(app.getHttpServer())
      .delete(base + '/7/lot-check/images/8')
      .set('Authorization', 'test')
      .expect(200);
    expect(service.deleteLotCheckImage).toHaveBeenCalledWith(3, 7, 8);
  });

  it.each([
    ['get', '', 'read', 'findAll'],
    ['get', '/7', 'read', 'findById'],
    ['post', '', 'create', 'create'],
    ['patch', '/7', 'update', 'update'],
    ['delete', '/7', 'delete', 'delete'],
  ] as const)(
    '%s %s requires permission and dispatches numeric parent/line ids',
    async (method, suffix, permission, action) => {
      await request(app.getHttpServer())
        [method](base + suffix)
        .expect(401);
      await request(app.getHttpServer())
        [method](base + suffix)
        .set('Authorization', 'test')
        .expect(403);
      expect(service[action]).not.toHaveBeenCalled();
      const body = {
        item_code: 'NL001',
        item_name: 'Nguyen lieu',
        planned_quantity: '1.25',
        unit: 'kg',
      };
      await request(app.getHttpServer())
        [method](base + suffix)
        .set('Authorization', 'test')
        .set('x-test-permission', `production-orders.${permission}`)
        .send(body)
        .expect(method === 'post' ? 201 : 200);
      const args = service[action].mock.calls[0];
      expect(args[0]).toBe(3);
      if (suffix) expect(args[1]).toBe(7);
      if (method === 'post' || method === 'patch')
        expect(args.at(-1)).toEqual(body);
    },
  );

  it.each([
    '/production-orders/weighing-records/invalid/lines',
    `${base}/invalid`,
  ])('rejects non-numeric ids: %s', async (url) => {
    await request(app.getHttpServer())
      .get(url)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.read')
      .expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
    expect(service.findById).not.toHaveBeenCalled();
  });
});
