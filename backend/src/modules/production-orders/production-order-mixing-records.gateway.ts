import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from '../users/users.service';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';

const roomFor = (recordId: number) => `mixing-record:${recordId}`;
const socketError = (code: string) =>
  Object.assign(new Error(code), { data: { code } });

@WebSocketGateway({ namespace: '/mixing-records', cors: { origin: '*' } })
export class ProductionOrderMixingRecordsGateway
  implements OnGatewayInit, OnGatewayConnection
{
  @WebSocketServer() server: Namespace;
  private readonly logger = new Logger(
    ProductionOrderMixingRecordsGateway.name,
  );

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Namespace) {
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

  async authenticate(socket: Socket) {
    const { accessToken, recordId } = socket.handshake.auth;
    if (typeof accessToken !== 'string' || !accessToken)
      throw socketError('AUTH_INVALID');
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
    // Older access tokens are upgraded through the existing REST refresh flow.
    // Refresh tokens must never authorize a socket connection.
    if (!payload || typeof payload !== 'object')
      throw socketError('AUTH_INVALID');
    if (!payload.token_use) throw socketError('AUTH_REFRESH_REQUIRED');
    if (
      payload.token_use !== 'access' ||
      !Number.isFinite(payload.exp) ||
      payload.exp * 1000 <= Date.now()
    ) {
      throw socketError('AUTH_INVALID');
    }
    const userId = Number(payload.sub);
    const id = Number(recordId);
    if (!Number.isSafeInteger(userId) || userId <= 0)
      throw socketError('AUTH_INVALID');
    if (!Number.isSafeInteger(id) || id <= 0)
      throw socketError('RECORD_NOT_FOUND');
    const user = await this.users.findById(userId);
    if (!user) throw socketError('AUTH_INVALID');
    const canRead = user.userRoles.some((role) =>
      role.roles.rolePermissions.some(
        (permission) =>
          permission.permissions.name === PRODUCTION_ORDER_PERMISSIONS.READ,
      ),
    );
    if (!canRead) throw socketError('FORBIDDEN');
    const record = await this.prisma.productionOrderMixingRecords.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!record) throw socketError('RECORD_NOT_FOUND');
    socket.data.recordId = id;
    socket.data.expiresAt = payload.exp * 1000;
  }

  async handleConnection(socket: Socket) {
    if (socket.data.expiresAt <= Date.now()) {
      socket.emit('auth:expired');
      socket.disconnect(true);
      return;
    }
    await socket.join(roomFor(socket.data.recordId));
    if (!socket.connected) return;
    const remaining = socket.data.expiresAt - Date.now();
    const timer = setTimeout(
      () => {
        socket.emit('auth:expired');
        socket.disconnect(true);
      },
      Math.max(0, Math.min(remaining, 2_147_483_647)),
    );
    timer.unref();
    socket.once('disconnect', () => clearTimeout(timer));
    // Sent after joining so a REST resync cannot miss a change during connection.
    socket.emit('mixing-record:ready', { recordId: socket.data.recordId });
  }

  async notifyMutation(result: Record<string, unknown>, deleted: boolean) {
    try {
      let recordId: number | undefined;
      if ('production_order_id' in result) {
        recordId = Number(result.id);
      } else if ('production_order_mixing_record_id' in result) {
        recordId = Number(result.production_order_mixing_record_id);
      } else if ('production_order_mixing_record_stage_id' in result) {
        const stage =
          await this.prisma.productionOrderMixingRecordStages.findUnique({
            where: {
              id: Number(result.production_order_mixing_record_stage_id),
            },
            select: { production_order_mixing_record_id: true },
          });
        recordId = stage?.production_order_mixing_record_id;
      } else if ('production_order_mixing_record_step_id' in result) {
        const step =
          await this.prisma.productionOrderMixingRecordSteps.findUnique({
            where: {
              id: Number(result.production_order_mixing_record_step_id),
            },
            select: {
              mixingRecordStage: {
                select: { production_order_mixing_record_id: true },
              },
            },
          });
        recordId = step?.mixingRecordStage.production_order_mixing_record_id;
      }
      if (recordId && this.server) {
        this.server.to(roomFor(recordId)).emit('mixing-record:changed', {
          recordId,
          deleted: deleted && 'production_order_id' in result,
        });
      }
    } catch {
      // A notification failure must not turn a committed REST write into an error.
      this.logger.error('Unable to notify mixing record subscribers');
    }
  }
}
