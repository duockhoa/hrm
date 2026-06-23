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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a reset OTP, stores the hash, and emails the plain OTP', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
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
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: 'user@example.com',
        subject: 'Ma OTP dat lai mat khau',
        message: expect.stringContaining('123456'),
        html: expect.stringContaining('123456'),
      }),
    );
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
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  prisma.$transaction = jest.fn(async (callback) => callback(prisma));

  return prisma;
}
