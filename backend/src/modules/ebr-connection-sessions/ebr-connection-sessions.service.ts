import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/prisma.service';
import { GetConnectionSessionsDto } from './dto/connection-sessions.dto';

export const RECONNECT_GRACE_MS = 90_000;
export const STALE_CONNECTION_MS = 120_000;
export const CONNECTED_THRESHOLD_MS = 60_000;

type Connection = { id: number; connection_key: string };
type ConnectionMetadata = {
  socketId: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class EbrConnectionSessionsService {
  private readonly logger = new Logger(EbrConnectionSessionsService.name);
  private sweeping = false;

  constructor(private readonly prisma: PrismaService) {}

  async connect(
    userId: number,
    clientSessionId: string,
    metadata: ConnectionMetadata,
  ) {
    const activeKey = `${userId}:${clientSessionId}`;
    await this.expireSessions(activeKey);
    const now = new Date();
    const connectionKey = randomUUID();
    const common = {
      connection_key: connectionKey,
      socket_id: metadata.socketId,
      last_seen_at: now,
      disconnected_at: null,
      disconnect_reason: null,
      ip_address: metadata.ipAddress?.slice(0, 45),
      user_agent: metadata.userAgent?.slice(0, 1000),
    };
    const args: Prisma.UserEbrSessionsUpsertArgs = {
      where: { active_key: activeKey },
      create: {
        ...common,
        user_id: userId,
        client_session_id: clientSessionId,
        active_key: activeKey,
        connected_at: now,
      },
      update: { ...common, connection_count: { increment: 1 } },
    };
    // Concurrent reload/reconnect handshakes can race on MySQL's unique key.
    try {
      return await this.prisma.userEbrSessions.upsert(args);
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      return this.prisma.userEbrSessions.upsert(args);
    }
  }

  async touch(connection: Connection) {
    const result = await this.prisma.userEbrSessions.updateMany({
      where: { ...connection, ended_at: null, disconnected_at: null },
      data: { last_seen_at: new Date() },
    });
    return result.count > 0;
  }

  async disconnect(connection: Connection, reason: string) {
    // An old socket must never disconnect a newer connection of the same tab.
    return this.prisma.userEbrSessions.updateMany({
      where: { ...connection, ended_at: null, disconnected_at: null },
      data: {
        disconnected_at: new Date(),
        disconnect_reason: reason.slice(0, 100),
      },
    });
  }

  async end(userId: number, clientSessionId: string) {
    const now = new Date();
    await this.prisma.userEbrSessions.updateMany({
      where: {
        user_id: userId,
        client_session_id: clientSessionId,
        ended_at: null,
      },
      data: {
        active_key: null,
        ended_at: now,
        disconnected_at: now,
        last_seen_at: now,
        end_reason: 'logout',
        disconnect_reason: 'logout',
      },
    });
    return { success: true };
  }

  @Interval(30_000)
  async sweepExpiredSessions() {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      await this.expireSessions();
    } catch (error) {
      this.logger.error('Unable to finalize expired EBR sessions', error);
    } finally {
      this.sweeping = false;
    }
  }

  async expireSessions(activeKey?: string) {
    const now = Date.now();
    const stale = await this.prisma.userEbrSessions.findMany({
      where: {
        ended_at: null,
        ...(activeKey ? { active_key: activeKey } : {}),
        OR: [
          { disconnected_at: { lte: new Date(now - RECONNECT_GRACE_MS) } },
          {
            disconnected_at: null,
            last_seen_at: { lte: new Date(now - STALE_CONNECTION_MS) },
          },
        ],
      },
      take: 500,
      orderBy: { last_seen_at: 'asc' },
      select: {
        id: true,
        connection_key: true,
        last_seen_at: true,
        disconnected_at: true,
      },
    });
    for (const session of stale) {
      // Compare the snapshot too: a heartbeat/reconnect may arrive during the sweep.
      await this.prisma.userEbrSessions.updateMany({
        where: { ...session, ended_at: null },
        data: {
          active_key: null,
          ended_at: session.disconnected_at ?? session.last_seen_at,
          end_reason: 'connection_lost',
        },
      });
    }
  }

  async findAll(query: GetConnectionSessionsDto) {
    const { page = 1, limit = 20 } = query;
    const where: Prisma.UserEbrSessionsWhereInput = {};
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.user = {
        OR: ['name', 'username', 'email'].map((field) => ({
          [field]: { contains: keyword },
        })),
      };
    }
    // The filters describe calendar days in Vietnam, independent of server TZ.
    const dateBoundary = (day: string) => {
      const date = new Date(`${day}T00:00:00+07:00`);
      if (
        !Number.isFinite(date.getTime()) ||
        new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10) !==
          day
      ) {
        throw new BadRequestException('Ngày lọc không hợp lệ');
      }
      return date;
    };
    const from = query.connected_from
      ? dateBoundary(query.connected_from)
      : undefined;
    const to = query.connected_to
      ? dateBoundary(query.connected_to)
      : undefined;
    if (from && to && from > to)
      throw new BadRequestException('Từ ngày phải trước hoặc bằng đến ngày');
    if (from || to)
      where.connected_at = {
        gte: from,
        lt: to ? new Date(to.getTime() + 86_400_000) : undefined,
      };

    const cutoff = new Date(Date.now() - CONNECTED_THRESHOLD_MS);
    const states: Record<string, Prisma.UserEbrSessionsWhereInput> = {
      connected: {
        ended_at: null,
        disconnected_at: null,
        last_seen_at: { gt: cutoff },
      },
      reconnecting: {
        ended_at: null,
        OR: [
          { disconnected_at: { not: null } },
          { last_seen_at: { lte: cutoff } },
        ],
      },
      ended: { ended_at: { not: null } },
    };
    const filtered = query.status
      ? { AND: [where, states[query.status]] }
      : where;
    const [data, total, connected, reconnecting, ended] =
      await this.prisma.$transaction([
        this.prisma.userEbrSessions.findMany({
          where: filtered,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ connected_at: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            connected_at: true,
            last_seen_at: true,
            disconnected_at: true,
            ended_at: true,
            end_reason: true,
            disconnect_reason: true,
            connection_count: true,
            ip_address: true,
            user_agent: true,
            user: {
              select: { id: true, username: true, name: true, email: true },
            },
          },
        }),
        this.prisma.userEbrSessions.count({ where: filtered }),
        ...['connected', 'reconnecting', 'ended'].map((status) =>
          this.prisma.userEbrSessions.count({
            where: { AND: [where, states[status]] },
          }),
        ),
      ]);
    return {
      data: data.map((session) => ({
        ...session,
        status: session.ended_at
          ? 'ended'
          : session.disconnected_at || session.last_seen_at <= cutoff
            ? 'reconnecting'
            : 'connected',
      })),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
      summary: { connected, reconnecting, ended },
    };
  }
}
