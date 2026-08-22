import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma.service';
import { EmailService } from '../email/email.service';

jest.mock('src/common/utils/otp.util', () => ({
  generateOtp: jest.fn(() => '123456'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let emailService: any;

  beforeEach(async () => {
    prisma = createPrismaMock();
    emailService = {
      sendEmail: jest.fn().mockResolvedValue({
        status: 'success',
        message: 'Email sent',
        provider: { status: 'success', message: 'Email sent' },
      }),
    };

    process.env.PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES = '10';
    process.env.PASSWORD_RESET_EMAIL_LOGO_URL =
      'https://example.com/dkpharmalogo.png';
    process.env.JWT_REFRESH_EXPIRES_IN = '3888000';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    delete process.env.PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES;
    delete process.env.PASSWORD_RESET_EMAIL_LOGO_URL;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('issues tokens without roles or permissions', async () => {
    const jwtService = (service as any).jwtService as JwtService;
    (jwtService.sign as jest.Mock)
      .mockReturnValueOnce('refresh-token')
      .mockReturnValueOnce('access-token');
    prisma.tokens.create.mockResolvedValue({ id: 10 });

    await expect(
      service.login({
        id: 1,
        username: 'user@example.com',
        userRoles: [
          {
            roles: {
              name: 'admin',
              rolePermissions: [{ permissions: { name: 'users.write' } }],
            },
          },
        ],
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      { username: 'user@example.com', sub: 1 },
      { expiresIn: 3888000 },
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(2, {
      username: 'user@example.com',
      sub: 1,
    });
    expect(prisma.userLoginSessions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 1,
        token_id: 10,
        session_key: expect.any(String),
        last_activity_at: expect.any(Date),
      }),
    });
  });

  it('closes the login session before deleting its refresh token', async () => {
    prisma.tokens.findUnique.mockResolvedValue({ id: 10, user_id: 1 });
    prisma.userLoginSessions.updateMany.mockResolvedValue({ count: 1 });
    prisma.tokens.delete.mockResolvedValue({ id: 10 });

    await expect(service.logout('refresh-token')).resolves.toBe(true);

    expect(prisma.userLoginSessions.updateMany).toHaveBeenCalledWith({
      where: { token_id: 10, logout_at: null },
      data: {
        logout_at: expect.any(Date),
        last_activity_at: expect.any(Date),
        logout_reason: 'manual',
      },
    });
    expect(prisma.tokens.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it('refreshes an access token without roles or permissions', async () => {
    const jwtService = (service as any).jwtService as JwtService;
    prisma.tokens.findUnique.mockResolvedValue({ user_id: 1 });
    (jwtService.verify as jest.Mock).mockReturnValue({
      username: 'user@example.com',
      sub: 1,
      roles: ['admin'],
      permissions: ['users.write'],
    });
    (jwtService.sign as jest.Mock).mockReturnValue('new-access-token');

    await expect(
      service.refreshToken({ refreshToken: 'refresh-token' }),
    ).resolves.toEqual({
      accessToken: 'new-access-token',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      username: 'user@example.com',
      sub: 1,
    });
  });

  it('creates a reset OTP, stores the hash, and emails the HTML OTP', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      name: 'Nguyễn Văn A',
    });
    prisma.passwordResetOTPs.create.mockImplementation(async (args) => ({
      id: 10,
      ...args.data,
    }));
    prisma.passwordResetOTPs.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.createResetPasswordOTP('user@example.com');

    expect(result).toBe(true);
    expect(prisma.passwordResetOTPs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 1,
        hash_OTP: expect.any(String),
        expires_at: expect.any(Date),
      }),
    });

    const createArg = prisma.passwordResetOTPs.create.mock.calls[0][0];
    await expect(
      bcrypt.compare('123456', createArg.data.hash_OTP),
    ).resolves.toBe(true);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const emailPayload = emailService.sendEmail.mock.calls[0][0];
    expect(emailPayload).toEqual(
      expect.objectContaining({
        recipients: 'user@example.com',
        subject: 'Mã OTP đặt lại mật khẩu',
        message: expect.stringContaining('123456'),
      }),
    );
    expect(emailPayload.message).toContain('10 phút');
    expect(emailPayload.html).toContain('<!doctype html>');
    expect(emailPayload.html).toContain('https://example.com/dkpharmalogo.png');
    expect(emailPayload.html).toContain('Xin chào Nguyễn Văn A');
    expect(emailPayload.html).toContain('123456');
    expect(emailPayload.html).toContain('10 phút');
    expect(emailPayload.html).toContain('font-family: Arial');
    expect(emailPayload.html).not.toContain('background: #0f766e');
    expect(prisma.passwordResetOTPs.updateMany).toHaveBeenCalledWith({
      where: {
        user_id: 1,
        id: { not: 10 },
        used_at: null,
      },
      data: { used_at: expect.any(Date) },
    });
  });

  it('deletes the stored OTP if sending email fails', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
    });
    prisma.passwordResetOTPs.create.mockResolvedValue({
      id: 10,
      user_id: 1,
    });
    prisma.passwordResetOTPs.delete.mockResolvedValue({ id: 10 });
    emailService.sendEmail.mockRejectedValue(new Error('Email failed'));

    await expect(
      service.createResetPasswordOTP('user@example.com'),
    ).rejects.toThrow('Email failed');

    expect(prisma.passwordResetOTPs.delete).toHaveBeenCalledWith({
      where: { id: 10 },
    });
    expect(prisma.passwordResetOTPs.updateMany).not.toHaveBeenCalled();
  });

  it('verifies the latest unused and unexpired OTP', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
    });
    prisma.passwordResetOTPs.findFirst.mockResolvedValue({
      id: 10,
      hash_OTP: await bcrypt.hash('123456', 4),
    });

    const result = await service.verifyResetPasswordOTP(
      'user@example.com',
      '123456',
    );

    expect(result).toBe(true);
    expect(prisma.passwordResetOTPs.findFirst).toHaveBeenCalledWith({
      where: {
        user_id: 1,
        used_at: null,
        expires_at: { gt: expect.any(Date) },
      },
      orderBy: { expires_at: 'desc' },
    });
  });

  it('resets password and marks the OTP as used', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
    });
    prisma.passwordResetOTPs.findFirst.mockResolvedValue({
      id: 10,
      hash_OTP: await bcrypt.hash('123456', 4),
    });
    prisma.passwordResetOTPs.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.users.update.mockResolvedValue({ id: 1 });

    const result = await service.resetPassword(
      'user@example.com',
      '123456',
      'new-password',
    );

    expect(result).toBe(true);
    expect(prisma.passwordResetOTPs.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 10,
        used_at: null,
        expires_at: { gt: expect.any(Date) },
      },
      data: { used_at: expect.any(Date) },
    });
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { password: expect.any(String) },
    });
    const updateArg = prisma.users.update.mock.calls[0][0];
    await expect(
      bcrypt.compare('new-password', updateArg.data.password),
    ).resolves.toBe(true);
  });
});

function createPrismaMock() {
  const prisma: any = {
    users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetOTPs: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    tokens: {
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    userLoginSessions: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  prisma.$transaction = jest.fn(async (callback) => callback(prisma));

  return prisma;
}
