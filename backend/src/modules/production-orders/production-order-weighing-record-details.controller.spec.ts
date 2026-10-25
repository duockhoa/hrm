import { ProductionOrderWeighingRecordsGateway } from './production-order-weighing-records.gateway';
import {
  ConflictException,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import {
  ProductionOrderWeighingRecordDetailsController,
  ProductionOrderWeighingDetailImagesController,
} from './production-order-weighing-record-details.controller';
import { ProductionOrderWeighingRecordDetailsService } from './production-order-weighing-record-details.service';
import {
  removeUploadedProductionOrderWeighingRecordDetailImage,
  resolveProductionOrderWeighingRecordDetailImageFile,
} from './production-order-weighing-record-detail-upload.config';

describe('Weighing detail HTTP API', () => {
  let app: INestApplication;
  let png: Buffer;
  const prefix = `weighing-details-test-${randomUUID()}`;
  const directory = join(
    process.cwd(),
    'uploads',
    'production-order-weighing-record-details',
    'images',
  );
  const base = '/production-orders/weighing-records/3/lines/7/details';
  const service = Object.fromEntries(
    [
      'findAll',
      'findById',
      'create',
      'update',
      'delete',
      'uploadImage',
      'uploadImages',
      'deleteImageById',
      'deleteImage',
      'findImage',
    ].map((key) => [key, jest.fn().mockResolvedValue({ id: 9 })]),
  );
  beforeAll(async () => {
    png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    const module = await Test.createTestingModule({
      controllers: [
        ProductionOrderWeighingRecordDetailsController,
        ProductionOrderWeighingDetailImagesController,
      ],
      providers: [
        {
          provide: ProductionOrderWeighingRecordsGateway,
          useValue: { notifyMutation: jest.fn() },
        },
        PermissionsGuard,
        {
          provide: ProductionOrderWeighingRecordDetailsService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = { id: 4, permissions: [req.headers['x-test-permission']] };
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
  afterEach(async () => {
    const files = await readdir(directory).catch(() => []);
    for (const filename of files.filter((name) => name.startsWith(prefix))) {
      await removeUploadedProductionOrderWeighingRecordDetailImage({
        path: join(directory, filename),
      } as Express.Multer.File);
    }
  });

  it.each([
    ['get', '', 'read', 'findAll'],
    ['get', '/9', 'read', 'findById'],
    ['post', '', 'create', 'create'],
    ['patch', '/9', 'update', 'update'],
    ['delete', '/9', 'delete', 'delete'],
    ['delete', '/9/image', 'update', 'deleteImage'],
    ['delete', '/9/images/12', 'update', 'deleteImageById'],
  ] as const)(
    '%s %s validates permission and parent IDs',
    async (method, suffix, permission, action) => {
      await request(app.getHttpServer())
        [method](base + suffix)
        .expect(401);
      await request(app.getHttpServer())
        [method](base + suffix)
        .set('Authorization', 'test')
        .expect(403);
      expect(service[action]).not.toHaveBeenCalled();
      await request(app.getHttpServer())
        [method](base + suffix)
        .set('Authorization', 'test')
        .set('x-test-permission', `production-orders.${permission}`)
        .send({ net_weight: '1.25' })
        .expect(method === 'post' ? 201 : 200);
      const args = service[action].mock.calls[0];
      expect(args.slice(0, 2)).toEqual([3, 7]);
      if (suffix) expect(args[2]).toBe(9);
      if (action === 'create' || action === 'update')
        expect(args.at(-1)).toMatchObject({ id: 4 });
    },
  );

  it('uploads a real image and serves a readable thumbnail/original', async () => {
    await request(app.getHttpServer())
      .post(`${base}/9/image`)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .attach('image', png, {
        filename: `${prefix}.png`,
        contentType: 'image/png',
      })
      .expect(201);
    const args = service.uploadImage.mock.calls[0];
    expect(args.slice(0, 3)).toEqual([3, 7, 9]);
    const file = args[3] as Express.Multer.File;
    const thumb = await resolveProductionOrderWeighingRecordDetailImageFile(
      file.filename,
    );
    const original = await resolveProductionOrderWeighingRecordDetailImageFile(
      file.filename,
      true,
    );
    expect(thumb?.contentType).toBe('image/webp');
    expect(original?.contentType).toBe('image/png');
    service.findImage.mockResolvedValueOnce(original);
    await request(app.getHttpServer())
      .get(
        `/production-orders/weighing-record-details/images/${file.filename}?original=true`,
      )
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.read')
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect('Cache-Control', 'private, no-store');
    expect(service.findImage).toHaveBeenCalledWith(file.filename, true);
  });

  it('removes uploaded files if the signed record rejects the mutation', async () => {
    service.uploadImage.mockRejectedValueOnce(new ConflictException('signed'));
    await request(app.getHttpServer())
      .post(`${base}/9/image`)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .attach('image', png, {
        filename: `${prefix}.png`,
        contentType: 'image/png',
      })
      .expect(409);
    expect(
      (await readdir(directory)).filter((name) => name.startsWith(prefix)),
    ).toEqual([]);
  });

  it('cleans uploads when route validation fails before the controller handler', async () => {
    await request(app.getHttpServer())
      .post(`${base}/invalid/image`)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .attach('image', png, {
        filename: `${prefix}.png`,
        contentType: 'image/png',
      })
      .expect(400);
    expect(service.uploadImage).not.toHaveBeenCalled();
    expect(
      (await readdir(directory)).filter((name) => name.startsWith(prefix)),
    ).toEqual([]);
  });

  it('creates weight, note and optional image together in one request', async () => {
    await request(app.getHttpServer())
      .post(base)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.create')
      .field('net_weight', '1.123456')
      .field('note', 'Weighing note')
      .attach('image', png, {
        filename: `${prefix}.png`,
        contentType: 'image/png',
      })
      .expect(201);
    const [recordId, lineId, dto, user, file] = service.create.mock.calls[0];
    expect([recordId, lineId]).toEqual([3, 7]);
    expect(dto).toEqual({ net_weight: '1.123456', note: 'Weighing note' });
    expect(user.id).toBe(4);
    expect(file.filename).toContain(prefix);
  });

  it('cleans image upload when creating the weighing detail is rejected', async () => {
    service.create.mockRejectedValueOnce(new ConflictException('signed'));
    await request(app.getHttpServer())
      .post(base)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.create')
      .field('net_weight', '1')
      .attach('image', png, {
        filename: `${prefix}.png`,
        contentType: 'image/png',
      })
      .expect(409);
    expect(
      (await readdir(directory)).filter((name) => name.startsWith(prefix)),
    ).toEqual([]);
  });

  it('creates a weighing detail with multiple images in one request', async () => {
    await request(app.getHttpServer())
      .post(base)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.create')
      .field('net_weight', '-0.5')
      .attach('images', png, {
        filename: `${prefix}-a.png`,
        contentType: 'image/png',
      })
      .attach('images', png, {
        filename: `${prefix}-b.png`,
        contentType: 'image/png',
      })
      .expect(201);
    expect(service.create.mock.calls[0][4]).toHaveLength(2);
    expect(service.create.mock.calls[0][2]).toEqual({ net_weight: '-0.5' });
  });

  it('cleans all uploaded images if the detail cannot be created', async () => {
    service.create.mockRejectedValueOnce(new ConflictException('signed'));
    await request(app.getHttpServer())
      .post(base)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.create')
      .field('net_weight', '1')
      .attach('images', png, {
        filename: `${prefix}-a.png`,
        contentType: 'image/png',
      })
      .attach('images', png, {
        filename: `${prefix}-b.png`,
        contentType: 'image/png',
      })
      .expect(409);
    expect(
      (await readdir(directory)).filter((name) => name.startsWith(prefix)),
    ).toEqual([]);
  });

  it('appends images using the update permission and parses image deletion IDs', async () => {
    await request(app.getHttpServer())
      .post(`${base}/9/images`)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .attach('images', png, {
        filename: `${prefix}-a.png`,
        contentType: 'image/png',
      })
      .attach('images', png, {
        filename: `${prefix}-b.png`,
        contentType: 'image/png',
      })
      .expect(201);
    expect(service.uploadImages.mock.calls[0].slice(0, 3)).toEqual([3, 7, 9]);
    expect(service.uploadImages.mock.calls[0][3]).toHaveLength(2);
    await request(app.getHttpServer())
      .delete(`${base}/9/images/12`)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .expect(200);
    expect(service.deleteImageById).toHaveBeenCalledWith(3, 7, 9, 12);
  });

  it('cleans multi-image uploads when a route parameter is invalid', async () => {
    await request(app.getHttpServer())
      .post(`${base}/invalid/images`)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .attach('images', png, {
        filename: `${prefix}-a.png`,
        contentType: 'image/png',
      })
      .attach('images', png, {
        filename: `${prefix}-b.png`,
        contentType: 'image/png',
      })
      .expect(400);
    expect(service.uploadImages).not.toHaveBeenCalled();
    expect(
      (await readdir(directory)).filter((name) => name.startsWith(prefix)),
    ).toEqual([]);
  });

  it('requires an image and rejects unsupported file types', async () => {
    await request(app.getHttpServer())
      .post(`${base}/9/image`)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .expect(400);
    await request(app.getHttpServer())
      .post(`${base}/9/image`)
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .attach('image', Buffer.from('text'), {
        filename: `${prefix}.txt`,
        contentType: 'text/plain',
      })
      .expect(400);
    expect(service.uploadImage).not.toHaveBeenCalled();
  });

  it('rejects path traversal when resolving images', async () => {
    expect(
      await resolveProductionOrderWeighingRecordDetailImageFile('../other.png'),
    ).toBeNull();
    expect(
      await resolveProductionOrderWeighingRecordDetailImageFile(
        '..\\other.png',
      ),
    ).toBeNull();
  });
});
