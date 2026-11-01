import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GUARDS_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { PrismaService } from 'src/prisma.service';
import { NetworkPoliciesService } from '../network-policies/network-policies.service';
import { ProductionOrderDeviationsController } from './production-order-deviations.controller';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';
import { ProductionOrderDeviationsModule } from './production-order-deviations.module';

describe('Deviation HTTP network access', () => {
  let app: INestApplication;
  let policy = 'IP_ALLOWLIST';
  const originalProxy = process.env.TRUSTED_PROXY_CIDRS;
  const service = {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({ id: 1 }),
    findImageFile: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const findMany = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductionOrderDeviationsController],
      providers: [
        PermissionsGuard,
        NetworkPoliciesService,
        { provide: ProductionOrderDeviationsService, useValue: service },
        {
          provide: PrismaService,
          useValue: { networkPolicyRanges: { findMany } },
        },
      ],
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
              req.headers['x-test-permission'] ??
                'production-order-deviations.list',
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
    findMany.mockResolvedValue([
      { cidr: '192.0.2.0/24' },
      { cidr: '2001:db8::/32' },
    ]);
  });
  afterAll(async () => {
    await app.close();
    if (originalProxy === undefined) delete process.env.TRUSTED_PROXY_CIDRS;
    else process.env.TRUSTED_PROXY_CIDRS = originalProxy;
  });
  const list = (ip: string) =>
    request(app.getHttpServer())
      .get('/production-order-deviations?production_order_id=123')
      .set('Authorization', 'test')
      .set('X-Forwarded-For', ip);

  it('guards all registered deviation controllers after authentication and permissions', () => {
    for (const controller of Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      ProductionOrderDeviationsModule,
    )) {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([
        jwtAuthGuard,
        PermissionsGuard,
        NetworkPolicyGuard,
      ]);
    }
  });
  it('allows OPEN without an IP lookup', async () => {
    policy = 'OPEN';
    await list('198.51.100.1').expect(200);
    expect(findMany).not.toHaveBeenCalled();
    expect(service.findAll).toHaveBeenCalledWith('123');
  });
  it.each(['192.0.2.1', '::ffff:192.0.2.1', '2001:db8::1'])(
    'allows matching IP %s',
    async (ip) => {
      await list(ip).expect(200);
      expect(service.findAll).toHaveBeenCalledWith('123');
    },
  );
  it('blocks after the user changes to an outside network', async () => {
    await list('192.0.2.1').expect(200);
    service.findAll.mockClear();
    const response = await list('198.51.100.1').expect(403);
    expect(response.body.code).toBe('IP_ACCESS_DENIED');
    expect(service.findAll).not.toHaveBeenCalled();
  });
  it.each([
    ['get', '/1', 'read', 'findById'],
    ['get', '/images/test.png', 'read', 'findImageFile'],
    ['post', '', 'create', 'create'],
    ['put', '/1', 'update', 'update'],
    ['delete', '/1', 'delete', 'delete'],
  ] as const)(
    'blocks %s %s before the handler executes',
    async (method, path, permission, handler) => {
      const response = await request(app.getHttpServer())
        [method](`/production-order-deviations${path}`)
        .set('Authorization', 'test')
        .set('x-test-permission', `production-order-deviations.${permission}`)
        .set('X-Forwarded-For', '198.51.100.1')
        .expect(403);
      expect(response.body.code).toBe('IP_ACCESS_DENIED');
      expect(service[handler]).not.toHaveBeenCalled();
    },
  );
  it('rejects empty lists and forged forwarded headers from untrusted peers', async () => {
    findMany.mockResolvedValue([]);
    await list('192.0.2.1').expect(403);
    findMany.mockResolvedValue([{ cidr: '192.0.2.0/24' }]);
    delete process.env.TRUSTED_PROXY_CIDRS;
    await list('192.0.2.1').expect(403);
  });
  it('preserves existing login and permission checks', async () => {
    policy = 'OPEN';
    await request(app.getHttpServer())
      .get('/production-order-deviations')
      .expect(401);
    await list('192.0.2.1').set('x-test-permission', 'other').expect(403);
    expect(service.findAll).not.toHaveBeenCalled();
  });
});
