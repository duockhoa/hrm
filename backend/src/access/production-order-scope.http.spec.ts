import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { jwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { AuthenticationMiddleware } from '../middleware/authentication/authentication.middleware';
import { PrismaService } from '../prisma.service';
import { ProductionOrderDeviationsController } from '../modules/production-order-deviations/production-order-deviations.controller';
import { ProductionOrderDeviationsService } from '../modules/production-order-deviations/production-order-deviations.service';
import { ProductionOrderDeviationNotificationService } from '../modules/production-order-deviations/production-order-deviation-notification.service';
import { productionOrderScopeExtension } from './production-order-scope.extension';
import * as deviationUploads from '../modules/production-order-deviations/production-order-deviation-upload.config';

// A small database substitute after the real Prisma extension. No DB or file I/O.
function matches(
  row: Record<string, any>,
  where: Record<string, any> = {},
): boolean {
  return Object.entries(where).every(([field, value]) => {
    if (value === undefined) return true;
    if (field === 'AND')
      return (Array.isArray(value) ? value : [value]).every((part) =>
        matches(row, part),
      );
    if (value && typeof value === 'object') {
      if ('in' in value) return value.in.includes(row[field]);
      if ('is' in value) return !!row[field] && matches(row[field], value.is);
    }
    return row[field] === value;
  });
}

describe('deviation visibility over HTTP', () => {
  let app: INestApplication;
  let roleLimit: number | null = 300;
  const imageResolver = jest
    .spyOn(deviationUploads, 'resolveDeviationImageFile')
    .mockResolvedValue(null);
  const orders = Array.from({ length: 301 }, (_, i) => ({ id: 301 - i }));
  const deviations = [
    {
      id: 10,
      production_order_id: 1,
      deleted_at: null,
      created_at: '2026-10-18',
      images: [],
    },
    {
      id: 11,
      production_order_id: 2,
      deleted_at: null,
      created_at: '2026-10-17',
      images: [],
    },
  ];
  const client = new PrismaClient()
    .$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (model === 'UserRoles')
              return [{ roles: { production_order_read_limit: roleLimit } }];
            const input = args as any;
            if (
              model === 'ProductionOrders' &&
              operation === 'findMany' &&
              input.take
            ) {
              return orders.slice(0, input.take);
            }
            return query(args);
          },
        },
      },
    })
    .$extends(productionOrderScopeExtension)
    .$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args }) {
            const rows =
              model === 'ProductionOrders'
                ? orders
                : model === 'ProductionOrderDeviations'
                  ? deviations
                  : model === 'ProductionOrderDeviationImages'
                    ? [
                        {
                          id: 1,
                          image_path:
                            deviationUploads.getDeviationImageLookupPaths(
                              'old.png',
                            )[0],
                          deleted_at: null,
                          deviation: deviations[0],
                        },
                      ]
                    : [];
            const visible = rows.filter((row) =>
              matches(row, (args as any)?.where),
            );
            return operation === 'findMany' ? visible : (visible[0] ?? null);
          },
        },
      },
    });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductionOrderDeviationsController],
      providers: [
        ProductionOrderDeviationsService,
        { provide: PrismaService, useValue: client },
        { provide: ProductionOrderDeviationNotificationService, useValue: {} },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context) {
          context.switchToHttp().getRequest().user = { id: 1 };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    const middleware = new AuthenticationMiddleware();
    app.use(middleware.use.bind(middleware));
    await app.init();
  });
  beforeEach(() => {
    roleLimit = 300;
    imageResolver.mockClear();
  });
  afterAll(async () => {
    await app.close();
    await client.$disconnect();
    imageResolver.mockRestore();
  });

  it('hides a newly created deviation on the 301st order but shows one on the 300th order', async () => {
    const response = await request(app.getHttpServer())
      .get('/production-order-deviations')
      .expect(200);
    expect(response.body.map((row) => row.id)).toEqual([11]);
  });

  it('denies direct access to an excluded deviation and its image', async () => {
    await request(app.getHttpServer())
      .get('/production-order-deviations/10')
      .expect(404);
    await request(app.getHttpServer())
      .get('/production-order-deviations/images/old.png')
      .expect(404);
    expect(imageResolver).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get('/production-order-deviations?production_order_id=1')
      .expect(404);
    await request(app.getHttpServer())
      .get('/production-order-deviations/11')
      .expect(200);
  });

  it('applies role changes on the next request', async () => {
    await request(app.getHttpServer())
      .get('/production-order-deviations/10')
      .expect(404);
    roleLimit = null;
    const response = await request(app.getHttpServer())
      .get('/production-order-deviations')
      .expect(200);
    expect(response.body.map((row) => row.id)).toEqual([10, 11]);
  });
});
