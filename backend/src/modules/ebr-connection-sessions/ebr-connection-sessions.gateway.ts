import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import type { DefaultEventsMap, Namespace, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma.service';
import { getClientIp } from '../network-policies/client-ip';
import { NetworkPoliciesService } from '../network-policies/network-policies.service';
import { UsersService } from '../users/users.service';
import { EbrConnectionSessionsService } from './ebr-connection-sessions.service';

const socketError = (code: string) =>
  Object.assign(new Error(code), { data: { code } });

type PresenceData = {
  userId: number;
  clientSessionId: string;
  expiresAt: number;
  disconnectReason?: string;
};
type PresenceSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  PresenceData
>;
type PresenceNamespace = Namespace<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  PresenceData
>;

@WebSocketGateway({ namespace: '/ebr-presence', cors: { origin: '*' } })
export class EbrConnectionSessionsGateway
  implements OnGatewayInit, OnGatewayConnection
{
  private readonly logger = new Logger(EbrConnectionSessionsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly networkPolicies: NetworkPoliciesService,
    private readonly sessions: EbrConnectionSessionsService,
  ) {}

  afterInit(server: PresenceNamespace) {
    server.use((socket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch((error: unknown) => {
          next(
            error instanceof Error && 'data' in error
              ? error
              : socketError('UNAVAILABLE'),
          );
        });
    });
  }

  async authenticate(socket: PresenceSocket) {
    const { accessToken, clientSessionId } = socket.handshake.auth;
    if (typeof accessToken !== 'string' || !accessToken)
      throw socketError('AUTH_INVALID');
    if (typeof clientSessionId !== 'string' || !isUUID(clientSessionId, '4'))
      throw socketError('SESSION_INVALID');
    let payload: { sub: number; exp: number; token_use?: string };
    try {
      payload = await this.jwt.verifyAsync(accessToken, {
        secret: process.env.JWT_SECRET,
        algorithms: ['HS256'],
      });
    } catch (error) {
      throw socketError(
        error instanceof Error && error.name === 'TokenExpiredError'
          ? 'AUTH_EXPIRED'
          : 'AUTH_INVALID',
      );
    }
    if (!payload || typeof payload !== 'object')
      throw socketError('AUTH_INVALID');
    if (!payload.token_use) throw socketError('AUTH_REFRESH_REQUIRED');
    const userId = Number(payload.sub);
    if (
      payload.token_use !== 'access' ||
      !Number.isFinite(payload.exp) ||
      payload.exp * 1000 <= Date.now() ||
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw socketError('AUTH_INVALID');
    }
    const user = await this.users.findById(userId);
    if (!user) throw socketError('AUTH_INVALID');
    const application = await this.prisma.userApplications.findFirst({
      where: { user_id: userId, application: { key: 'hsl', is_active: true } },
      select: { id: true },
    });
    if (!application) throw socketError('FORBIDDEN');
    try {
      await this.networkPolicies.assertAllowed(
        user.network_policy_code,
        getClientIp(socket.request),
      );
    } catch {
      throw socketError('IP_ACCESS_DENIED');
    }
    socket.data.userId = userId;
    socket.data.clientSessionId = clientSessionId;
    socket.data.expiresAt = payload.exp * 1000;
  }

  async handleConnection(socket: PresenceSocket) {
    let connection: { id: number; connection_key: string } | undefined;
    let expirationTimer: ReturnType<typeof setTimeout> | undefined;
    let touching = false;
    let lastTouch = Date.now();
    let initialized: () => void;
    const ready = new Promise<void>((resolve) => {
      initialized = resolve;
    });
    const reportError = (error: unknown) =>
      this.logger.error('Unable to update EBR connection history', error);
    const markDisconnected = async (reason: string) => {
      if (connection)
        await this.sessions.disconnect(
          connection,
          socket.data.disconnectReason ?? reason,
        );
    };
    // Engine.IO pong packets still run when a background tab throttles JS timers.
    const onPacket = (packet: { type: string }) => {
      if (
        packet.type !== 'pong' ||
        !connection ||
        touching ||
        Date.now() - lastTouch < 20_000
      )
        return;
      touching = true;
      lastTouch = Date.now();
      this.sessions
        .touch(connection)
        .then((active) => {
          if (!active) {
            socket.emit('ebr-session:ended');
            socket.disconnect();
          }
        })
        .catch(reportError)
        .finally(() => {
          touching = false;
        });
    };
    socket.conn.on('packet', onPacket);
    socket.on(
      'ebr-session:logout',
      (acknowledge: (value: { success: boolean }) => void) => {
        void (async () => {
          await ready;
          await this.sessions.end(
            socket.data.userId,
            socket.data.clientSessionId,
          );
          if (typeof acknowledge === 'function') acknowledge({ success: true });
          socket.disconnect();
        })().catch((error) => {
          reportError(error);
          if (typeof acknowledge === 'function')
            acknowledge({ success: false });
        });
      },
    );
    socket.once('disconnect', (reason) => {
      clearTimeout(expirationTimer);
      socket.conn.off('packet', onPacket);
      void markDisconnected(reason).catch(reportError);
    });
    try {
      if (socket.data.expiresAt <= Date.now()) {
        socket.emit('auth:expired');
        socket.disconnect();
        return;
      }
      const session = await this.sessions.connect(
        socket.data.userId,
        socket.data.clientSessionId,
        {
          socketId: socket.id,
          ipAddress: getClientIp(socket.request),
          userAgent: socket.handshake.headers['user-agent'],
        },
      );
      connection = { id: session.id, connection_key: session.connection_key };
      if (!socket.connected) {
        await markDisconnected('transport close');
        return;
      }
      expirationTimer = setTimeout(
        () => {
          socket.data.disconnectReason = 'auth_expired';
          socket.emit('auth:expired');
          socket.disconnect();
        },
        Math.max(
          0,
          Math.min(socket.data.expiresAt - Date.now(), 2_147_483_647),
        ),
      );
      expirationTimer.unref();
      socket.emit('ebr-session:ready', { sessionId: session.id });
    } catch (error) {
      reportError(error);
      // Client retries transient database failures with backoff.
      socket.emit('ebr-session:retry');
      socket.disconnect();
    } finally {
      initialized!();
    }
  }
}
