import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { io, Socket } from 'socket.io-client';
import { PrismaService } from 'src/prisma.service';
import { NetworkPoliciesService } from '../network-policies/network-policies.service';
import { UsersService } from '../users/users.service';
import { EbrConnectionSessionsGateway } from './ebr-connection-sessions.gateway';
import { EbrConnectionSessionsService } from './ebr-connection-sessions.service';

describe('EBR presence socket integration', () => {
  let app: INestApplication;
  let url: string;
  const sockets: Socket[] = [];
  const jwt = new JwtService({ secret: 'ebr-presence-test' });
  const previousSecret = process.env.JWT_SECRET;
  const users = { findById: jest.fn() };
  const prisma = { userApplications: { findFirst: jest.fn() } };
  const network = { assertAllowed: jest.fn() };
  const sessions = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    touch: jest.fn(),
    end: jest.fn(),
  };
  const event = <T = { data: { code: string } }>(
    socket: Socket,
    name: string,
  ) =>
    new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Missing event ${name}`)),
        3000,
      );
      socket.once(name, (value: T) => {
        clearTimeout(timeout);
        resolve(value);
      });
    });
  const connect = (
    token = jwt.sign({ sub: 1, token_use: 'access' }, { expiresIn: 60 }),
    clientSessionId = randomUUID(),
  ) => {
    const socket = io(`${url}/ebr-presence`, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: { accessToken: token, clientSessionId },
    });
    sockets.push(socket);
    return socket;
  };
  beforeAll(async () => {
    process.env.JWT_SECRET = 'ebr-presence-test';
    const module = await Test.createTestingModule({
      providers: [
        EbrConnectionSessionsGateway,
        { provide: JwtService, useValue: jwt },
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
        { provide: NetworkPoliciesService, useValue: network },
        { provide: EbrConnectionSessionsService, useValue: sessions },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    users.findById.mockResolvedValue({ id: 1, network_policy_code: 'OPEN' });
    prisma.userApplications.findFirst.mockResolvedValue({ id: 1 });
    network.assertAllowed.mockResolvedValue(undefined);
    sessions.connect.mockResolvedValue({
      id: 42,
      connection_key: randomUUID(),
    });
    sessions.touch.mockResolvedValue(true);
    sessions.end.mockResolvedValue({ success: true });
  });
  afterEach(async () => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
  afterAll(async () => {
    await app.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('records an authenticated connection and its disconnect on the server', async () => {
    const socket = connect();
    const ready = event(socket, 'ebr-session:ready');
    socket.connect();
    expect(await ready).toEqual({ sessionId: 42 });
    expect(sessions.connect).toHaveBeenCalledWith(
      1,
      socket.auth['clientSessionId'],
      expect.objectContaining({ socketId: socket.id }),
    );
    const disconnected = new Promise<void>((resolve) =>
      sessions.disconnect.mockImplementationOnce(() => {
        resolve();
        return Promise.resolve();
      }),
    );
    socket.disconnect();
    await disconnected;
    expect(sessions.disconnect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      'client namespace disconnect',
    );
  });

  it.each([
    ['forged', () => 'invalid', 'AUTH_INVALID'],
    [
      'expired',
      () => jwt.sign({ sub: 1, token_use: 'access' }, { expiresIn: -1 }),
      'AUTH_EXPIRED',
    ],
    [
      'refresh token',
      () => jwt.sign({ sub: 1, token_use: 'refresh' }, { expiresIn: 60 }),
      'AUTH_INVALID',
    ],
    [
      'legacy access token',
      () => jwt.sign({ sub: 1 }, { expiresIn: 60 }),
      'AUTH_REFRESH_REQUIRED',
    ],
  ])(
    'rejects %s before recording a connection',
    async (_name, getToken, code) => {
      const socket = connect(getToken());
      const rejected = event(socket, 'connect_error');
      socket.connect();
      expect((await rejected).data.code).toBe(code);
      expect(sessions.connect).not.toHaveBeenCalled();
    },
  );

  it('rejects users without EBR access', async () => {
    prisma.userApplications.findFirst.mockResolvedValueOnce(null);
    const socket = connect();
    const rejected = event(socket, 'connect_error');
    socket.connect();
    expect((await rejected).data.code).toBe('FORBIDDEN');
    expect(sessions.connect).not.toHaveBeenCalled();
  });

  it('enforces network policies and validates the tab identifier', async () => {
    network.assertAllowed.mockRejectedValueOnce(new Error('blocked'));
    const socket = connect();
    const rejected = event(socket, 'connect_error');
    socket.connect();
    expect((await rejected).data.code).toBe('IP_ACCESS_DENIED');
    const invalid = connect(
      undefined,
      'not-a-uuid' as `${string}-${string}-${string}-${string}-${string}`,
    );
    const invalidResult = event(invalid, 'connect_error');
    invalid.connect();
    expect((await invalidResult).data.code).toBe('SESSION_INVALID');
    expect(sessions.connect).not.toHaveBeenCalled();
  });

  it('acknowledges logout only after the connection history is finalized', async () => {
    const socket = connect();
    const ready = event(socket, 'ebr-session:ready');
    socket.connect();
    await ready;
    const result = await socket.timeout(2000).emitWithAck('ebr-session:logout');
    expect(result).toEqual({ success: true });
    expect(sessions.end).toHaveBeenCalledWith(
      1,
      socket.auth['clientSessionId'],
    );
  });

  it('requests credential renewal when the access token expires', async () => {
    const socket = connect(
      jwt.sign({ sub: 1, token_use: 'access' }, { expiresIn: 1 }),
    );
    const ready = event(socket, 'ebr-session:ready');
    const expired = event(socket, 'auth:expired');
    socket.connect();
    await ready;
    await expired;
    expect(sessions.connect).toHaveBeenCalledTimes(1);
  });
});
