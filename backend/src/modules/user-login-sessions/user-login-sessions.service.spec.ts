import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { UserLoginSessionsService } from './user-login-sessions.service';

describe('UserLoginSessionsService', () => {
  let service: UserLoginSessionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      userLoginSessions: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (operations) => Promise.all(operations)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLoginSessionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UserLoginSessionsService);
  });

  it('returns paginated active sessions for a user', async () => {
    prisma.userLoginSessions.findMany.mockResolvedValue([{ id: 9 }]);
    prisma.userLoginSessions.count.mockResolvedValue(21);

    await expect(
      service.findAll({ page: 2, limit: 10, user_id: 3, status: 'active' }),
    ).resolves.toEqual({
      data: [{ id: 9 }],
      meta: { page: 2, limit: 10, total: 21, total_pages: 3 },
    });

    expect(prisma.userLoginSessions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 3, logout_at: null },
        skip: 10,
        take: 10,
        orderBy: { login_at: 'desc' },
      }),
    );
  });
});
