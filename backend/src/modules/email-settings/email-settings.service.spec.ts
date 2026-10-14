import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EmailSettingsService } from './email-settings.service';

describe('EmailSettingsService', () => {
  const prisma = {
    emailTypes: { findUnique: jest.fn() },
    emailDefaultRecipients: { upsert: jest.fn(), deleteMany: jest.fn() },
    emailUserRecipients: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    users: { findUnique: jest.fn() },
  };
  const service = new EmailSettingsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.emailTypes.findUnique.mockResolvedValue({
      id: 1,
      code: 'sampling_request',
      defaultRecipients: null,
      userRecipients: [],
    });
    prisma.users.findUnique.mockResolvedValue({ email: 'actor@example.com' });
  });

  it('sends to the actor when no configuration exists', async () => {
    await expect(
      service.resolveRecipients('sampling_request', 7),
    ).resolves.toEqual(['actor@example.com']);
    expect(prisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { email: true },
    });
    expect(prisma.emailTypes.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          userRecipients: { where: { user_id: 7 } },
        }),
      }),
    );
  });

  it('resolves only defaults for deviation notifications even when personal recipients exist', async () => {
    prisma.emailTypes.findUnique.mockResolvedValue({
      defaultRecipients: { email: 'default@example.com,DEFAULT@example.com' },
      userRecipients: [{ email: 'personal@example.com' }],
    });
    await expect(
      service.resolveDefaultRecipients('production_order_deviation_created'),
    ).resolves.toEqual(['default@example.com']);
    expect(prisma.emailTypes.findUnique).toHaveBeenCalledWith({
      where: { code: 'production_order_deviation_created' },
      include: { defaultRecipients: true },
    });
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('does not fall back to the actor when defaults are empty', async () => {
    await expect(
      service.resolveDefaultRecipients('production_order_deviation_created'),
    ).resolves.toEqual([]);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('keeps deviation emails on default recipients through the generic email endpoint', async () => {
    prisma.emailTypes.findUnique.mockResolvedValue({
      code: 'production_order_deviation_created',
      defaultRecipients: { email: 'default@example.com' },
      userRecipients: [{ email: 'personal@example.com' }],
    });
    await expect(
      service.resolveRecipients('production_order_deviation_created', 7),
    ).resolves.toEqual(['default@example.com']);
    await expect(
      service.savePersonal(7, 1, 'personal@example.com'),
    ).rejects.toThrow('Phiếu sai lệch chỉ dùng người nhận email mặc định.');
    expect(prisma.emailUserRecipients.upsert).not.toHaveBeenCalled();
    prisma.emailTypes.findUnique.mockResolvedValue({ defaultRecipients: null });
    await expect(
      service.resolveRecipients('production_order_deviation_created', 7),
    ).rejects.toThrow('Chưa cấu hình người nhận email mặc định');
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('uses defaults instead of the actor', async () => {
    prisma.emailTypes.findUnique.mockResolvedValue({
      defaultRecipients: {
        email: ' qc@example.com, qa@example.com ,QC@example.com,,',
      },
      userRecipients: [],
    });
    await expect(
      service.resolveRecipients('sampling_request', 7),
    ).resolves.toEqual(['qc@example.com', 'qa@example.com']);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('uses personal recipients instead of defaults and the actor', async () => {
    prisma.emailTypes.findUnique.mockResolvedValue({
      defaultRecipients: { email: 'default@example.com' },
      userRecipients: [{ email: 'personal@example.com,other@example.com' }],
    });
    await expect(
      service.resolveRecipients('sampling_request', 7),
    ).resolves.toEqual(['personal@example.com', 'other@example.com']);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('falls back from comma-only personal settings to defaults', async () => {
    prisma.emailTypes.findUnique.mockResolvedValue({
      defaultRecipients: { email: 'default@example.com' },
      userRecipients: [{ email: ' , ,  ' }],
    });
    await expect(
      service.resolveRecipients('sampling_request', 7),
    ).resolves.toEqual(['default@example.com']);
  });

  it('falls back to the actor when both settings are empty', async () => {
    prisma.emailTypes.findUnique.mockResolvedValue({
      defaultRecipients: { email: ' , ' },
      userRecipients: [{ email: '  ' }],
    });
    await expect(
      service.resolveRecipients('sampling_request', 7),
    ).resolves.toEqual(['actor@example.com']);
  });

  it('rejects missing actor emails and unknown types', async () => {
    prisma.users.findUnique.mockResolvedValue({ email: null });
    await expect(
      service.resolveRecipients('sampling_request', 7),
    ).rejects.toBeInstanceOf(BadRequestException);
    prisma.emailTypes.findUnique.mockResolvedValue(null);
    await expect(
      service.resolveRecipients('unknown', 7),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires a valid authenticated actor', async () => {
    await expect(
      service.resolveRecipients('sampling_request', null),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.emailTypes.findUnique).not.toHaveBeenCalled();
  });

  it('normalizes and saves defaults in a single row', async () => {
    await service.saveDefault(
      1,
      ' qc@example.com,QA@example.com,qc@example.com, ',
    );
    expect(prisma.emailDefaultRecipients.upsert).toHaveBeenCalledWith({
      where: { email_type_id: 1 },
      create: { email_type_id: 1, email: 'qc@example.com,QA@example.com' },
      update: { email: 'qc@example.com,QA@example.com' },
    });
  });

  it('removes empty defaults rather than overriding the fallback', async () => {
    await service.saveDefault(1, ' , , ');
    expect(prisma.emailDefaultRecipients.deleteMany).toHaveBeenCalledWith({
      where: { email_type_id: 1 },
    });
    expect(prisma.emailDefaultRecipients.upsert).not.toHaveBeenCalled();
  });

  it('saves personal settings only for the specified actor and type', async () => {
    await service.savePersonal(7, 1, 'personal@example.com');
    expect(prisma.emailUserRecipients.upsert).toHaveBeenCalledWith({
      where: { user_id_email_type_id: { user_id: 7, email_type_id: 1 } },
      create: { user_id: 7, email_type_id: 1, email: 'personal@example.com' },
      update: { email: 'personal@example.com' },
    });
    await service.savePersonal(7, 1, ' , ');
    expect(prisma.emailUserRecipients.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 7, email_type_id: 1 },
    });
  });

  it('rejects malformed addresses without changing configuration', async () => {
    await expect(
      service.saveDefault(1, 'good@example.com,not-an-email'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.emailDefaultRecipients.upsert).not.toHaveBeenCalled();
    expect(prisma.emailDefaultRecipients.deleteMany).not.toHaveBeenCalled();
  });

  it('keeps settings isolated when listing a personal configuration', async () => {
    service.findPersonal(7);
    expect(prisma.emailUserRecipients.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 7 } }),
    );
  });
});
