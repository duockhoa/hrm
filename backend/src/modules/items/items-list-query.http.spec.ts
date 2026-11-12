import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { PrismaService } from 'src/prisma.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemEquipmentService } from './item-equipment.service';
import { DatePrintTemplatesService } from './date-print-templates.service';
import { MixingActivityTemplatesService } from './mixing-activity-templates.service';
import { MixingActivityTemplateStagesService } from './mixing-activity-template-stages.service';
import { MixingActivityTemplateStageStepsService } from './mixing-activity-template-stage-steps.service';
import { MixingActivityTemplateStageStepParametersService } from './mixing-activity-template-stage-step-parameters.service';

describe('Items list query HTTP contract', () => {
  let app: INestApplication;
  const findMany = jest.fn();
  const count = jest.fn();
  const paths = [
    '/items',
    '/items/finished-products',
    '/items/semi-finished-products',
    '/items/raw-materials',
  ];

  beforeAll(async () => {
    const builder = Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        ItemsService,
        { provide: PrismaService, useValue: { items: { findMany, count } } },
        ...[
          ItemEquipmentService,
          DatePrintTemplatesService,
          MixingActivityTemplatesService,
          MixingActivityTemplateStagesService,
          MixingActivityTemplateStageStepsService,
          MixingActivityTemplateStageStepParametersService,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    });
    for (const guard of [jwtAuthGuard, PermissionsGuard, NetworkPolicyGuard]) {
      builder.overrideGuard(guard).useValue({ canActivate: () => true });
    }
    const module = await builder.compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([{ item_code: 'TP001', series: 108 }]);
    count.mockResolvedValue(42);
  });
  afterAll(async () => {
    await app.close();
  });

  it.each(paths)(
    'supports paging, select and count without changing the array body on %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .query({
          skip: 0,
          top: 10,
          series: '108',
          select: 'item_code,series',
          count: true,
        })
        .expect('X-Total-Count', '42')
        .expect(200, [{ item_code: 'TP001', series: 108 }]);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          select: { item_code: true, series: true },
        }),
      );
      expect(count).toHaveBeenCalledWith({
        where: findMany.mock.calls[0][0].where,
      });
    },
  );

  it('keeps legacy requests unpaginated with default relations and no count header', async () => {
    const response = await request(app.getHttpServer())
      .get('/items?codePrefix=tp')
      .expect(200);
    expect(response.headers).not.toHaveProperty('x-total-count');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { item_code: { startsWith: 'TP' } },
        include: expect.objectContaining({ registration: true }),
      }),
    );
    expect(findMany.mock.calls[0][0]).not.toHaveProperty('take');
    expect(count).not.toHaveBeenCalled();
  });

  it('parses false flags and does not query count when count=false', async () => {
    await request(app.getHttpServer())
      .get('/items?hasRegistration=false&count=false&expand=none')
      .expect(200);
    expect(findMany).toHaveBeenCalledWith({
      where: { registration_id: null },
      include: {},
      orderBy: [{ item_code: 'asc' }],
    });
    expect(count).not.toHaveBeenCalled();
  });

  it('returns zero total and an empty array for an empty result', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    await request(app.getHttpServer())
      .get('/items?skip=999&count=true')
      .expect('X-Total-Count', '0')
      .expect(200, []);
  });

  it.each([
    'top=201',
    'top=1&top=2',
    'select=password',
    'expand=users',
    'series[gt]=1',
    'unknown=x',
  ])('rejects invalid HTTP query %s before a database call', async (query) => {
    await request(app.getHttpServer()).get(`/items?${query}`).expect(400);
    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });

  it('documents all eleven params and the count header for all list routes', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    for (const path of paths) {
      const operation = document.paths[path].get!;
      expect(
        operation.parameters?.map((param) =>
          'name' in param ? param.name : '',
        ),
      ).toEqual(
        expect.arrayContaining([
          'skip',
          'top',
          'search',
          'codePrefix',
          'series',
          'registrationId',
          'hasRegistration',
          'select',
          'orderBy',
          'count',
          'expand',
        ]),
      );
      expect(operation.responses['200']).toHaveProperty(
        'headers.X-Total-Count',
      );
    }
  });
});
