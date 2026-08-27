import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { GetUserLoginSessionsDto } from './dto/get-user-login-sessions.dto';

@Injectable()
export class UserLoginSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetUserLoginSessionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.UserLoginSessionsWhereInput = {};

    if (query.user_id !== undefined) {
      where.user_id = query.user_id;
    }

    if (query.status === 'active') {
      where.logout_at = null;
    }

    if (query.status === 'logged_out') {
      where.logout_at = { not: null };
    }

    const keyword = query.keyword?.trim();
    if (keyword) {
      where.user = {
        OR: [
          { name: { contains: keyword } },
          { username: { contains: keyword } },
          { email: { contains: keyword } },
        ],
      };
    }

    if (query.login_from || query.login_to) {
      const loginAt: Prisma.DateTimeFilter = {};
      if (query.login_from) {
        loginAt.gte = new Date(query.login_from);
      }
      if (query.login_to) {
        const endOfDay = new Date(query.login_to);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        loginAt.lt = endOfDay;
      }
      where.login_at = loginAt;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userLoginSessions.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { login_at: 'desc' },
        select: {
          id: true,
          session_key: true,
          login_at: true,
          logout_at: true,
          last_activity_at: true,
          logout_reason: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.userLoginSessions.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
