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
import { ItemsModule } from './items.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemEquipmentService } from './item-equipment.service';
import { DatePrintTemplatesService } from './date-print-templates.service';
import { MixingActivityTemplatesService } from './mixing-activity-templates.service';
import { MixingActivityTemplateStagesService } from './mixing-activity-template-stages.service';
import { MixingActivityTemplateStageStepsService } from './mixing-activity-template-stage-steps.service';
import { MixingActivityTemplateStageStepParametersService } from './mixing-activity-template-stage-step-parameters.service';

describe('Items network policy', () => {
  let app: INestApplication;
  let policy = 'IP_ALLOWLIST';
  const originalProxy = process.env.TRUSTED_PROXY_CIDRS;
  const findAll = jest.fn().mockResolvedValue([]);
  const findAllSeries = jest.fn().mockResolvedValue([{ series: 108, name: 'TP' }]);
  const findSeriesById = jest.fn().mockResolvedValue({ series: 108, name: 'TP' });
  const update = jest.fn().mockResolvedValue({ item_code: 'TP001' });
  const findImageFile = jest.fn();
  const findMany = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        PermissionsGuard,
        NetworkPoliciesService,
        {
          provide: ItemsService,
          useValue: { findAll, update, findAllSeries, findSeriesById },
        },
        { provide: ItemEquipmentService, useValue: {} },
        { provide: DatePrintTemplatesService, useValue: { findImageFile } },
        { provide: MixingActivityTemplatesService, useValue: {} },
        { provide: MixingActivityTemplateStagesService, useValue: {} },
        { provide: MixingActivityTemplateStageStepsService, useValue: {} },
        {
          provide: MixingActivityTemplateStageStepParametersService,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: { networkPolicyRanges: { findMany } },
        },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = {
            id: 1,
            network_policy_code: policy,
            permissions: [req.headers['x-test-permission'] ?? 'items.list'],
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
      .get('/items')
      .set('Authorization', 'test')
      .set('X-Forwarded-For', ip);

  it('covers every controller registered in ItemsModule', () => {
    for (const controller of Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      ItemsModule,
    )) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller);
      expect(guards).toEqual([
        jwtAuthGuard,
        PermissionsGuard,
        NetworkPolicyGuard,
      ]);
    }
  });
  it('allows OPEN independently of IP and retains permissions', async () => {
    policy = 'OPEN';
    await list('198.51.100.1').expect(200);
    await list('198.51.100.1').set('x-test-permission', 'other').expect(403);
    expect(findMany).not.toHaveBeenCalled();
  });
  it.each(['192.0.2.10', '::ffff:192.0.2.10', '2001:db8::123'])(
    'allows matching IP %s',
    async (ip) => {
      await list(ip).expect(200);
      expect(findAll).toHaveBeenCalled();
    },
  );
  it('blocks after switching to an outside network without executing the service', async () => {
    await list('192.0.2.10').expect(200);
    findAll.mockClear();
    const response = await list('198.51.100.1').expect(403);
    expect(response.body.code).toBe('IP_ACCESS_DENIED');
    expect(findAll).not.toHaveBeenCalled();
  });
  it('blocks writes and template image downloads before their handlers execute', async () => {
    await request(app.getHttpServer())
      .patch('/items/TP001')
      .set('Authorization', 'test')
      .set('X-Forwarded-For', '198.51.100.1')
      .set('x-test-permission', 'items.update')
      .send({})
      .expect(403);
    const response = await request(app.getHttpServer())
      .get('/items/date-print-templates/images/test.png')
      .set('Authorization', 'test')
      .set('X-Forwarded-For', '198.51.100.1')
      .set('x-test-permission', 'date-print-templates.read')
      .expect(403);
    expect(response.body.code).toBe('IP_ACCESS_DENIED');
    expect(update).not.toHaveBeenCalled();
    expect(findImageFile).not.toHaveBeenCalled();
  });
  it('blocks an empty allowlist and ignores forged headers without a trusted proxy', async () => {
    findMany.mockResolvedValue([]);
    await list('192.0.2.10').expect(403);
    findMany.mockResolvedValue([{ cidr: '192.0.2.0/24' }]);
    delete process.env.TRUSTED_PROXY_CIDRS;
    await list('192.0.2.10').expect(403);
    expect(findAll).not.toHaveBeenCalled();
  });
  it('still requires authentication', async () => {
    await request(app.getHttpServer()).get('/items').expect(401);
  });

  it('routes series requests and validates the series id', async () => {
    policy = 'OPEN';
    await request(app.getHttpServer())
      .get('/items/series')
      .set('Authorization', 'test')
      .expect(200, [{ series: 108, name: 'TP' }]);
    await request(app.getHttpServer())
      .get('/items/series/108')
      .set('Authorization', 'test')
      .set('x-test-permission', 'items.read')
      .expect(200, { series: 108, name: 'TP' });
    expect(findSeriesById).toHaveBeenCalledWith(108);
    await request(app.getHttpServer())
      .get('/items/series/invalid')
      .set('Authorization', 'test')
      .set('x-test-permission', 'items.read')
      .expect(400);
  });

  it('protects series data with authentication, permissions and network policy', async () => {
    await request(app.getHttpServer()).get('/items/series').expect(401);
    await request(app.getHttpServer())
      .get('/items/series')
      .set('Authorization', 'test')
      .set('X-Forwarded-For', '192.0.2.10')
      .set('x-test-permission', 'other')
      .expect(403);
    await request(app.getHttpServer())
      .get('/items/series')
      .set('Authorization', 'test')
      .set('X-Forwarded-For', '198.51.100.1')
      .expect(403);
    expect(findAllSeries).not.toHaveBeenCalled();
  });
});
