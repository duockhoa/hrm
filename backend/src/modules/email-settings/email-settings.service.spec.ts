import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { EmailSettingsService } from './email-settings.service';

describe('EmailSettingsService', () => {
  const prisma = {
    emailTypes: { findUnique: jest.fn() },
    emailDefaultRecipients: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
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
    prisma.emailDefaultRecipients.updateMany.mockResolvedValue({ count: 1 });
    prisma.emailDefaultRecipients.deleteMany.mockResolvedValue({ count: 1 });
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
      create: { email_type_id: 1, email: 'qc@example.com QA@example.com' },
      update: { email: 'qc@example.com QA@example.com' },
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

  it('adds a recipient to one space-separated field and rejects duplicates', async () => {
    prisma.emailDefaultRecipients.findUnique.mockResolvedValue(null);
    prisma.emailDefaultRecipients.create.mockImplementation(({ data }) => ({
      id: 4,
      ...data,
    }));
    await expect(
      service.addDefaultEmail(1, ' qc@example.com '),
    ).resolves.toMatchObject({ email: 'qc@example.com' });
    prisma.emailDefaultRecipients.findUnique.mockResolvedValue({
      id: 4,
      email_type_id: 1,
      email: 'qc@example.com,old@example.com',
    });
    await expect(
      service.addDefaultEmail(1, 'qa@example.com'),
    ).resolves.toMatchObject({
      email: 'qc@example.com old@example.com qa@example.com',
    });
    await expect(
      service.addDefaultEmail(1, 'QC@example.com'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('edits only the requested recipient and does not merge duplicate addresses', async () => {
    prisma.emailDefaultRecipients.findUnique.mockResolvedValue({
      id: 4,
      email_type_id: 1,
      email: 'qc@example.com qa@example.com',
    });
    await expect(
      service.updateDefaultEmail(1, 'QC@example.com', 'qc-new@example.com'),
    ).resolves.toMatchObject({ email: 'qc-new@example.com qa@example.com' });
    prisma.emailDefaultRecipients.updateMany.mockClear();
    await expect(
      service.updateDefaultEmail(1, 'qc@example.com', 'QA@example.com'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.updateDefaultEmail(1, 'missing@example.com', 'new@example.com'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.emailDefaultRecipients.updateMany).not.toHaveBeenCalled();
  });

  it('deletes one recipient and removes the configuration when deleting the last one', async () => {
    prisma.emailDefaultRecipients.findUnique.mockResolvedValue({
      id: 4,
      email_type_id: 1,
      email: 'qc@example.com qa@example.com',
    });
    await expect(
      service.deleteDefaultEmail(1, 'QC@example.com'),
    ).resolves.toMatchObject({ email: 'qa@example.com' });
    prisma.emailDefaultRecipients.findUnique.mockResolvedValue({
      id: 4,
      email_type_id: 1,
      email: 'qa@example.com',
    });
    await expect(
      service.deleteDefaultEmail(1, 'qa@example.com'),
    ).resolves.toEqual({ email_type_id: 1, email: '' });
    expect(prisma.emailDefaultRecipients.deleteMany).toHaveBeenCalledWith({
      where: { id: 4, email: 'qa@example.com' },
    });
  });

  it('preserves recipients added concurrently while editing a different address', async () => {
    prisma.emailDefaultRecipients.findUnique
      .mockResolvedValueOnce({ id: 4, email: 'qc@example.com qa@example.com' })
      .mockResolvedValueOnce({
        id: 4,
        email: 'qc@example.com qa@example.com concurrent@example.com',
      });
    prisma.emailDefaultRecipients.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    await expect(
      service.updateDefaultEmail(1, 'qc@example.com', 'new@example.com'),
    ).resolves.toMatchObject({
      email: 'new@example.com qa@example.com concurrent@example.com',
    });
    expect(prisma.emailDefaultRecipients.updateMany).toHaveBeenCalledTimes(2);
  });

  it('preserves the first recipient when two users create a configuration concurrently', async () => {
    prisma.emailDefaultRecipients.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 4, email: 'first@example.com' });
    prisma.emailDefaultRecipients.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.19.1',
      }),
    );
    await expect(
      service.addDefaultEmail(1, 'second@example.com'),
    ).resolves.toMatchObject({ email: 'first@example.com second@example.com' });
  });

  it('reads mixed legacy commas and whitespace, and rejects multiple addresses in single-row operations', async () => {
    prisma.emailTypes.findUnique.mockResolvedValue({
      defaultRecipients: {
        email: ' qc@example.com\nqa@example.com,QC@example.com ',
      },
    });
    await expect(
      service.resolveDefaultRecipients('sampling_request'),
    ).resolves.toEqual(['qc@example.com', 'qa@example.com']);
    await expect(
      service.addDefaultEmail(1, 'a@example.com b@example.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.emailDefaultRecipients.create).not.toHaveBeenCalled();
  });
});
