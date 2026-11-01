import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MODULE_METADATA, GUARDS_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PrismaService } from 'src/prisma.service';
import { NetworkPoliciesService } from '../network-policies/network-policies.service';
import { ProductionOrdersModule } from './production-orders.module';
import { ProductionOrderWeighingRecordsController } from './production-order-weighing-records.controller';
import { ProductionOrderWeighingRecordsService } from './production-order-weighing-records.service';
import { ProductionOrderWeighingRecordsEventsInterceptor } from './production-order-weighing-records-events.interceptor';

describe('Production Order network policy coverage', () => {
  it('guards every registered controller after authentication', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      ProductionOrdersModule,
    );
    expect(controllers).toHaveLength(8);
    for (const controller of controllers) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller);
      expect(guards).toContain(NetworkPolicyGuard);
      expect(guards.indexOf(jwtAuthGuard)).toBeLessThan(
        guards.indexOf(NetworkPolicyGuard),
      );
    }
  });
});

describe('Production Order HTTP network policy', () => {
  let app: INestApplication;
  let policy = 'IP_ALLOWLIST';
  const originalProxy = process.env.TRUSTED_PROXY_CIDRS;
  const read = jest.fn().mockResolvedValue({ id: 1 });
  const update = jest.fn().mockResolvedValue({ id: 1 });
  const findMany = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductionOrderWeighingRecordsController],
      providers: [
        PermissionsGuard,
        NetworkPoliciesService,
        {
          provide: ProductionOrderWeighingRecordsService,
          useValue: { findById: read, update },
        },
        {
          provide: PrismaService,
          useValue: { networkPolicyRanges: { findMany } },
        },
      ],
    })
      .overrideInterceptor(ProductionOrderWeighingRecordsEventsInterceptor)
      .useValue({
        intercept: (_context: unknown, next: { handle: () => unknown }) =>
          next.handle(),
      })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(ctx: ExecutionContext) {
          const req = ctx.switchToHttp().getRequest();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = {
            id: 1,
            network_policy_code: policy,
            permissions: [
              req.headers['x-test-permission'] ?? 'production-orders.read',
            ],
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    policy = 'IP_ALLOWLIST';
    process.env.TRUSTED_PROXY_CIDRS = '127.0.0.1/8,::1/128';
    findMany.mockResolvedValue([{ cidr: '192.0.2.0/24' }]);
  });
  afterAll(async () => {
    await app.close();
    if (originalProxy === undefined) delete process.env.TRUSTED_PROXY_CIDRS;
    else process.env.TRUSTED_PROXY_CIDRS = originalProxy;
  });
  const get = (ip: string) =>
    request(app.getHttpServer())
      .get('/production-orders/weighing-records/1')
      .set('Authorization', 'test')
      .set('X-Forwarded-For', ip);
  it('allows OPEN and matching IPs, blocks the same user after a network change', async () => {
    policy = 'OPEN';
    await get('198.51.100.1').expect(200);
    policy = 'IP_ALLOWLIST';
    await get('192.0.2.1').expect(200);
    read.mockClear();
    const denied = await get('198.51.100.1').expect(403);
    expect(denied.body.code).toBe('IP_ACCESS_DENIED');
    expect(read).not.toHaveBeenCalled();
  });
  it('blocks writes before the service runs', async () => {
    await request(app.getHttpServer())
      .patch('/production-orders/weighing-records/1')
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.update')
      .set('X-Forwarded-For', '198.51.100.1')
      .send({})
      .expect(403);
    expect(update).not.toHaveBeenCalled();
  });
  it('does not permit forged headers without trusted proxy configuration', async () => {
    delete process.env.TRUSTED_PROXY_CIDRS;
    await get('192.0.2.1').expect(403);
    expect(read).not.toHaveBeenCalled();
  });
  it('preserves authentication and permission requirements', async () => {
    policy = 'OPEN';
    await request(app.getHttpServer())
      .get('/production-orders/weighing-records/1')
      .expect(401);
    await get('192.0.2.1').set('x-test-permission', 'other').expect(403);
    expect(read).not.toHaveBeenCalled();
  });
});
