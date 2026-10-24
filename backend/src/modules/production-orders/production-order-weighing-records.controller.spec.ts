import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { ProductionOrderWeighingRecordsController } from './production-order-weighing-records.controller';
import { ProductionOrderWeighingRecordsService } from './production-order-weighing-records.service';

describe('Weighing record HTTP routes', () => {
  let app: INestApplication;
  const service = Object.fromEntries(
    [
      'findAllByProductionOrder',
      'findById',
      'create',
      'update',
      'delete',
      'approveByQaStaff',
      'approveByIpcStaff',
    ].map((method) => [method, jest.fn().mockResolvedValue({ id: 3 })]),
  );
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductionOrderWeighingRecordsController],
      providers: [
        PermissionsGuard,
        { provide: ProductionOrderWeighingRecordsService, useValue: service },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = { id: 7, permissions: [req.headers['x-test-permission']] };
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

  it('requires authentication and the existing production-order permission', async () => {
    await request(app.getHttpServer())
      .get('/production-orders/42/weighing-records')
      .expect(401);
    await request(app.getHttpServer())
      .get('/production-orders/42/weighing-records')
      .set('Authorization', 'test')
      .expect(403);
    expect(service.findAllByProductionOrder).not.toHaveBeenCalled();
  });

  it.each([
    ['get', '/42/weighing-records', 'read', 'findAllByProductionOrder', 42],
    ['get', '/weighing-records/3', 'read', 'findById', 3],
    ['post', '/42/weighing-records', 'create', 'create', 42],
    ['patch', '/weighing-records/3', 'update', 'update', 3],
    ['delete', '/weighing-records/3', 'delete', 'delete', 3],
    [
      'patch',
      '/weighing-records/3/qa-staff-approval',
      'update',
      'approveByQaStaff',
      3,
    ],
    [
      'patch',
      '/weighing-records/3/ipc-staff-approval',
      'update',
      'approveByIpcStaff',
      3,
    ],
  ] as const)(
    '%s %s dispatches with permission %s',
    async (method, path, permission, action, id) => {
      await request(app.getHttpServer())
        [method](`/production-orders${path}`)
        .set('Authorization', 'test')
        .set('x-test-permission', `production-orders.${permission}`)
        .send({ description: 'test' })
        .expect(method === 'post' ? 201 : 200);
      expect(service[action].mock.calls[0][0]).toBe(id);
      if (action === 'create' || action.startsWith('approve')) {
        expect(service[action].mock.calls[0].at(-1)).toMatchObject({ id: 7 });
      }
    },
  );

  it('rejects a non-numeric record id before calling the service', async () => {
    await request(app.getHttpServer())
      .get('/production-orders/weighing-records/invalid')
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.read')
      .expect(400);
    expect(service.findById).not.toHaveBeenCalled();
  });
});
