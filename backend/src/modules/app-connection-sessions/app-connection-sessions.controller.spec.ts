import {
  type ExecutionContext,
  type INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import {
  AppConnectionSessionsController,
  EbrConnectionSessionsController,
} from './app-connection-sessions.controller';
import { AppConnectionSessionsService } from './app-connection-sessions.service';
import { ConnectionHistoryPdfService } from './connection-history-pdf.service';

describe.each([
  ['/ebr-connection-sessions', 'hsl'],
  ['/app-connection-sessions/hsl', 'hsl'],
  ['/app-connection-sessions/wms', 'wms'],
] as const)('%s HTTP authorization', (route, applicationKey) => {
  let app: INestApplication<Server>;
  const sessions = { findAll: jest.fn(), end: jest.fn() };
  const historyPdf = { export: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AppConnectionSessionsController,
        EbrConnectionSessionsController,
      ],
      providers: [
        { provide: AppConnectionSessionsService, useValue: sessions },
        { provide: ConnectionHistoryPdfService, useValue: historyPdf },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: { id: number; permissions: string[] };
          }>();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = {
            id: 7,
            permissions:
              req.headers.authorization === 'Bearer admin'
                ? ['users.list']
                : [],
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
    sessions.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });
    sessions.end.mockResolvedValue({ success: true });
  });
  afterAll(() => app.close());

  it('requires authentication and users.list permission for the history', async () => {
    await request(app.getHttpServer()).get(route).expect(401);
    await request(app.getHttpServer())
      .get(route)
      .set('Authorization', 'Bearer user')
      .expect(403);
    await request(app.getHttpServer())
      .get(`${route}?page=2&limit=10`)
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(sessions.findAll).toHaveBeenCalledWith(
      applicationKey,
      expect.objectContaining({ page: 2, limit: 10 }),
    );
  });

  if (route.startsWith('/app-connection-sessions/')) {
    it('protects PDF exports and passes the route application and date/user filters', async () => {
      const exportRoute = `${route}/export-pdf`;
      await request(app.getHttpServer()).get(exportRoute).expect(401);
      await request(app.getHttpServer())
        .get(exportRoute)
        .set('Authorization', 'Bearer user')
        .expect(403);
      await request(app.getHttpServer())
        .get(`${exportRoute}?connected_to=invalid`)
        .set('Authorization', 'Bearer admin')
        .expect(400);
      expect(historyPdf.export).not.toHaveBeenCalled();

      historyPdf.export.mockResolvedValue(Buffer.from('%PDF-'));
      await request(app.getHttpServer())
        .get(
          `${exportRoute}?connected_from=2026-11-01&connected_to=2026-11-28&keyword=0987&limit=1`,
        )
        .set('Authorization', 'Bearer admin')
        .expect('Content-Type', 'application/pdf')
        .expect(
          'Content-Disposition',
          `attachment; filename="lich-su-ket-noi-${applicationKey === 'hsl' ? 'ebr' : 'wms'}.pdf"`,
        )
        .expect('Cache-Control', 'no-store')
        .expect(200);
      expect(historyPdf.export).toHaveBeenCalledWith(applicationKey, {
        connected_from: '2026-11-01',
        connected_to: '2026-11-28',
        keyword: '0987',
      });
    });
  }

  it('validates pagination, dates and status before querying history', async () => {
    for (const query of [
      'page=0',
      'limit=301',
      'pagination=unknown',
      `cursor=${'x'.repeat(257)}`,
      'status=unknown',
      'connected_from=invalid',
    ]) {
      await request(app.getHttpServer())
        .get(`${route}?${query}`)
        .set('Authorization', 'Bearer admin')
        .expect(400);
    }
    expect(sessions.findAll).not.toHaveBeenCalled();
  });

  it('accepts cursor pagination with 300 records', async () => {
    await request(app.getHttpServer())
      .get(`${route}?pagination=cursor&limit=300`)
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(sessions.findAll).toHaveBeenCalledWith(
      applicationKey,
      expect.objectContaining({ pagination: 'cursor', limit: 300 }),
    );
  });

  it('does not let query or body fields override the route application or authenticated user', async () => {
    const otherApplication = applicationKey === 'hsl' ? 'wms' : 'hsl';
    await request(app.getHttpServer())
      .get(
        `${route}?application_key=${otherApplication}&applicationKey=${otherApplication}`,
      )
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(sessions.findAll).toHaveBeenCalledWith(
      applicationKey,
      expect.not.objectContaining({ application_key: otherApplication }),
    );
    const clientSessionId = '0464244a-e11a-4e03-9e41-f6c7309b125c';
    await request(app.getHttpServer())
      .post(`${route}/end`)
      .set('Authorization', 'Bearer user')
      .send({
        client_session_id: clientSessionId,
        user_id: 99,
        application_key: otherApplication,
      })
      .expect(201);
    expect(sessions.end).toHaveBeenCalledWith(
      applicationKey,
      7,
      clientSessionId,
    );
  });

  it('rejects applications outside the supported list', async () => {
    await request(app.getHttpServer())
      .get('/app-connection-sessions/unknown')
      .set('Authorization', 'Bearer admin')
      .expect(400);
    await request(app.getHttpServer())
      .post('/app-connection-sessions/unknown/end')
      .set('Authorization', 'Bearer user')
      .send({ client_session_id: '0464244a-e11a-4e03-9e41-f6c7309b125c' })
      .expect(400);
    expect(sessions.findAll).not.toHaveBeenCalled();
    expect(sessions.end).not.toHaveBeenCalled();
  });

  it('lets a normal user end only their own tab session', async () => {
    const clientSessionId = '0464244a-e11a-4e03-9e41-f6c7309b125c';
    await request(app.getHttpServer())
      .post(`${route}/end`)
      .set('Authorization', 'Bearer user')
      .send({ client_session_id: clientSessionId, user_id: 99 })
      .expect(201);
    expect(sessions.end).toHaveBeenCalledWith(
      applicationKey,
      7,
      clientSessionId,
    );
    await request(app.getHttpServer())
      .post(`${route}/end`)
      .set('Authorization', 'Bearer user')
      .send({ client_session_id: 'invalid' })
      .expect(400);
  });
});
