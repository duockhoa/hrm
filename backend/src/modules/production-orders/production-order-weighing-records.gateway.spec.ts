import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from '../users/users.service';
import { ProductionOrderWeighingRecordsGateway } from './production-order-weighing-records.gateway';
import { ProductionOrderWeighingRecordsEventsInterceptor } from './production-order-weighing-records-events.interceptor';

describe('Weighing record REST + socket integration', () => {
  let app: INestApplication;
  let url: string;
  let gateway: ProductionOrderWeighingRecordsGateway;
  let interceptor: ProductionOrderWeighingRecordsEventsInterceptor;
  const sockets: Socket[] = [];
  const originalSecret = process.env.JWT_SECRET;
  const jwt = new JwtService({ secret: 'weighing-record-test-secret' });
  const token = (sub = 1, token_use = 'access', expiresIn = 60) =>
    jwt.sign({ sub, token_use }, { expiresIn });
  const users = {
    findById: jest.fn(async (id: number) =>
      id === 99
        ? null
        : {
            id,
            userRoles:
              id === 2
                ? []
                : [
                    {
                      roles: {
                        rolePermissions: [
                          { permissions: { name: 'production-orders.read' } },
                        ],
                      },
                    },
                  ],
          },
    ),
  };
  const prisma = {
    productionOrderWeighingRecords: {
      findUnique: jest.fn(async ({ where }: { where: { id: number } }) =>
        where.id < 3 ? { id: where.id } : null,
      ),
    },
  };
  const context = (method: string, recordId?: number) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          params: recordId ? { recordId: String(recordId) } : {},
        }),
      }),
    }) as ExecutionContext;
  const connect = (accessToken: string, recordId = 1) => {
    const socket = io(`${url}/weighing-records`, {
      auth: { accessToken, recordId },
      transports: ['websocket'],
      reconnection: false,
      autoConnect: false,
    });
    sockets.push(socket);
    return socket;
  };
  const event = <T = unknown>(socket: Socket, name: string): Promise<T> =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Missing ${name}`)),
        3000,
      );
      socket.once(name, (data: T) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
  const ready = async (socket: Socket) => {
    const received = event(socket, 'weighing-record:ready');
    socket.connect();
    return received;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'weighing-record-test-secret';
    const module = await Test.createTestingModule({
      providers: [
        ProductionOrderWeighingRecordsGateway,
        ProductionOrderWeighingRecordsEventsInterceptor,
        { provide: JwtService, useValue: jwt },
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    gateway = app.get(ProductionOrderWeighingRecordsGateway);
    interceptor = app.get(ProductionOrderWeighingRecordsEventsInterceptor);
  });
  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });
  afterAll(async () => {
    await app.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it.each([
    ['missing', () => '', 1, 'AUTH_INVALID'],
    ['forged', () => `${token()}bad`, 1, 'AUTH_INVALID'],
    ['expired', () => token(1, 'access', -1), 1, 'AUTH_EXPIRED'],
    ['refresh', () => token(1, 'refresh'), 1, 'AUTH_INVALID'],
    [
      'legacy',
      () => jwt.sign({ sub: 1 }, { expiresIn: 60 }),
      1,
      'AUTH_REFRESH_REQUIRED',
    ],
    ['without read permission', () => token(2), 1, 'FORBIDDEN'],
    ['deleted user', () => token(99), 1, 'AUTH_INVALID'],
    ['missing record', () => token(), 99, 'RECORD_NOT_FOUND'],
  ])(
    'rejects %s credentials or subscriptions',
    async (_label, getToken, recordId, code) => {
      const socket = connect(getToken(), recordId);
      const rejected = event<{ data: { code: string } }>(
        socket,
        'connect_error',
      );
      socket.connect();
      expect((await rejected).data.code).toBe(code);
      expect(socket.connected).toBe(false);
    },
  );

  it('notifies only subscribers of the changed record after a successful REST write', async () => {
    const first = connect(token(), 1);
    const second = connect(token(), 2);
    await Promise.all([ready(first), ready(second)]);
    const otherRecordChanged = jest.fn();
    second.on('weighing-record:changed', otherRecordChanged);
    const changed = event(first, 'weighing-record:changed');
    const result = { id: 1, production_order_id: 10, description: 'Saved' };
    await expect(
      firstValueFrom(
        interceptor.intercept(context('PATCH'), { handle: () => of(result) }),
      ),
    ).resolves.toEqual(result);
    expect(await changed).toEqual({ recordId: 1, deleted: false });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(otherRecordChanged).not.toHaveBeenCalled();
  });

  it.each([
    { id: 10, production_order_weighing_record_id: 1 },
    { id: 20, production_order_weighing_record_line_id: 10 },
    [{ id: 30, production_order_weighing_record_id: 1 }],
  ])(
    'notifies nested and bulk mutations using the validated record route',
    async (result) => {
      const socket = connect(token());
      await ready(socket);
      const changed = event(socket, 'weighing-record:changed');
      await firstValueFrom(
        interceptor.intercept(context('POST', 1), { handle: () => of(result) }),
      );
      expect(await changed).toEqual({ recordId: 1, deleted: false });
    },
  );

  it('distinguishes deletion of the whole record', async () => {
    const socket = connect(token());
    await ready(socket);
    const changed = event(socket, 'weighing-record:changed');
    await gateway.notifyMutation(1, true);
    expect(await changed).toEqual({ recordId: 1, deleted: true });
  });

  it('does not emit changes for GETs or failed writes', async () => {
    const notify = jest.spyOn(gateway, 'notifyMutation');
    await firstValueFrom(
      interceptor.intercept(context('GET'), { handle: () => of({ id: 1 }) }),
    );
    await expect(
      firstValueFrom(
        interceptor.intercept(context('PATCH'), {
          handle: () => throwError(() => new Error('write failed')),
        }),
      ),
    ).rejects.toThrow('write failed');
    expect(notify).not.toHaveBeenCalled();
    notify.mockRestore();
  });

  it('disconnects an expired access token and allows a fresh-token reconnect', async () => {
    const socket = connect(token(1, 'access', 2));
    await ready(socket);
    const expired = event(socket, 'auth:expired');
    const disconnected = event(socket, 'disconnect');
    await expired;
    await disconnected;
    expect(socket.connected).toBe(false);
    socket.auth = { accessToken: token(), recordId: 1 };
    expect(await ready(socket)).toEqual({ recordId: 1 });
  });
});
