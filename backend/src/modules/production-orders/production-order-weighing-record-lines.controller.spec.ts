import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { ProductionOrderWeighingRecordLinesController } from './production-order-weighing-record-lines.controller';
import { ProductionOrderWeighingRecordLinesService } from './production-order-weighing-record-lines.service';

describe('Weighing record line HTTP routes', () => {
  let app: INestApplication;
  const service = Object.fromEntries(
    ['findAll', 'findById', 'create', 'update', 'delete'].map((method) => [
      method,
      jest.fn().mockResolvedValue({ id: 7 }),
    ]),
  );
  const base = '/production-orders/weighing-records/3/lines';
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductionOrderWeighingRecordLinesController],
      providers: [
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
          req.user = { permissions: [req.headers['x-test-permission']] };
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
