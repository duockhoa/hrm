import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: number, query: GetNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationsWhereInput = {
      user_id: userId,
      ...(query.unread_only ? { is_read: false } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notifications.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          actorUser: {
            select: { id: true, username: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async findOneForUser(id: number, userId: number) {
    const notification = await this.prisma.notifications.findFirst({
      where: { id, user_id: userId },
      include: {
        actorUser: {
          select: { id: true, username: true, name: true, avatar: true },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async create(dto: CreateNotificationDto, actorUserId: number) {
    await this.ensureUserExists(dto.user_id);

    return this.prisma.notifications.create({
      data: {
        user_id: dto.user_id,
        actor_user_id: actorUserId,
        title: dto.title.trim(),
        message: dto.message.trim(),
        type: dto.type?.trim() || 'system',
        action_url: this.normalizeOptionalString(dto.action_url),
        metadata:
          dto.metadata === null
            ? Prisma.JsonNull
            : (dto.metadata as Prisma.InputJsonValue | undefined),
        expires_at: dto.expires_at ?? undefined,
      },
    });
  }

  async markAsRead(id: number, userId: number) {
    await this.findOneForUser(id, userId);

    return this.prisma.notifications.update({
      where: { id },
      data: { is_read: true, read_at: new Date() },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
  }

  async unreadCount(userId: number) {
    const count = await this.prisma.notifications.count({
      where: { user_id: userId, is_read: false },
    });

    return { count };
  }

  async delete(id: number, userId: number) {
    await this.findOneForUser(id, userId);
    return this.prisma.notifications.delete({ where: { id } });
  }

  private async ensureUserExists(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Recipient user not found');
    }
  }

  private normalizeOptionalString(value: string | null | undefined) {
    if (value === undefined || value === null) {
      return null;
    }

    return value.trim() || null;
  }
}
