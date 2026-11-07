import {
  type ExecutionContext,
  type INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { EbrConnectionSessionsController } from './ebr-connection-sessions.controller';
import { EbrConnectionSessionsService } from './ebr-connection-sessions.service';

describe('EBR connection history HTTP authorization', () => {
  let app: INestApplication<Server>;
  const sessions = { findAll: jest.fn(), end: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [EbrConnectionSessionsController],
      providers: [
        { provide: EbrConnectionSessionsService, useValue: sessions },
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
    await request(app.getHttpServer())
      .get('/ebr-connection-sessions')
      .expect(401);
    await request(app.getHttpServer())
      .get('/ebr-connection-sessions')
      .set('Authorization', 'Bearer user')
      .expect(403);
    await request(app.getHttpServer())
      .get('/ebr-connection-sessions?page=2&limit=10')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(sessions.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 }),
    );
  });

  it('validates pagination, dates and status before querying history', async () => {
    for (const query of [
      'page=0',
      'limit=101',
      'status=unknown',
      'connected_from=invalid',
    ]) {
      await request(app.getHttpServer())
        .get(`/ebr-connection-sessions?${query}`)
        .set('Authorization', 'Bearer admin')
        .expect(400);
    }
    expect(sessions.findAll).not.toHaveBeenCalled();
  });

  it('lets a normal user end only their own tab session', async () => {
    const clientSessionId = '0464244a-e11a-4e03-9e41-f6c7309b125c';
    await request(app.getHttpServer())
      .post('/ebr-connection-sessions/end')
      .set('Authorization', 'Bearer user')
      .send({ client_session_id: clientSessionId, user_id: 99 })
      .expect(201);
    expect(sessions.end).toHaveBeenCalledWith(7, clientSessionId);
    await request(app.getHttpServer())
      .post('/ebr-connection-sessions/end')
      .set('Authorization', 'Bearer user')
      .send({ client_session_id: 'invalid' })
      .expect(400);
  });
});
