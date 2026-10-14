import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isEmail } from 'class-validator';
import { PrismaService } from 'src/prisma.service';
import {
  CreateEmailTypeDto,
  UpdateEmailTypeDto,
} from './dto/email-settings.dto';
import { EMAIL_TYPE_CODES } from './constants/email-settings.constants';

@Injectable()
export class EmailSettingsService {
  constructor(private readonly prismaService: PrismaService) {}

  findTypes() {
    return this.prismaService.emailTypes.findMany({ orderBy: { id: 'asc' } });
  }

  async createType(dto: CreateEmailTypeDto) {
    const code = dto.code?.trim();
    if (
      typeof code !== 'string' ||
      !/^[a-z][a-z0-9_]*$/.test(code) ||
      code.length > 100
    ) {
      throw new BadRequestException('Mã loại email không hợp lệ.');
    }
    const name = this.normalizeName(dto.name);
    try {
      return await this.prismaService.emailTypes.create({
        data: { code, name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Mã loại email đã tồn tại.');
      }
      throw error;
    }
  }

  async updateType(id: number, dto: UpdateEmailTypeDto) {
    await this.ensureTypeExists(id);
    return this.prismaService.emailTypes.update({
      where: { id },
      data: { name: this.normalizeName(dto.name) },
    });
  }

  findDefaults() {
    return this.prismaService.emailTypes.findMany({
      include: { defaultRecipients: true },
      orderBy: { id: 'asc' },
    });
  }

  async saveDefault(emailTypeId: number, value: string) {
    await this.ensureTypeExists(emailTypeId);
    const email = this.normalizeEmails(value).join(',');
    if (!email) return this.deleteDefault(emailTypeId);
    return this.prismaService.emailDefaultRecipients.upsert({
      where: { email_type_id: emailTypeId },
      create: { email_type_id: emailTypeId, email },
      update: { email },
    });
  }

  async deleteDefault(emailTypeId: number) {
    await this.ensureTypeExists(emailTypeId);
    await this.prismaService.emailDefaultRecipients.deleteMany({
      where: { email_type_id: emailTypeId },
    });
    return { email_type_id: emailTypeId, email: '' };
  }

  findPersonal(userId: number) {
    this.ensureUserId(userId);
    return this.prismaService.emailUserRecipients.findMany({
      where: { user_id: userId },
      include: { emailType: true },
      orderBy: { email_type_id: 'asc' },
    });
  }

  async savePersonal(userId: number, emailTypeId: number, value: string) {
    this.ensureUserId(userId);
    const emailType = await this.ensureTypeExists(emailTypeId);
    if (
      emailType.code === EMAIL_TYPE_CODES.PRODUCTION_ORDER_DEVIATION_CREATED
    ) {
      throw new BadRequestException(
        'Phiếu sai lệch chỉ dùng người nhận email mặc định.',
      );
    }
    const email = this.normalizeEmails(value).join(',');
    if (!email) return this.deletePersonal(userId, emailTypeId);
    return this.prismaService.emailUserRecipients.upsert({
      where: {
        user_id_email_type_id: { user_id: userId, email_type_id: emailTypeId },
      },
      create: { user_id: userId, email_type_id: emailTypeId, email },
      update: { email },
    });
  }

  async deletePersonal(userId: number, emailTypeId: number) {
    this.ensureUserId(userId);
    await this.ensureTypeExists(emailTypeId);
    await this.prismaService.emailUserRecipients.deleteMany({
      where: { user_id: userId, email_type_id: emailTypeId },
    });
    return { user_id: userId, email_type_id: emailTypeId, email: '' };
  }

  async resolveDefaultRecipients(code: string): Promise<string[]> {
    if (typeof code !== 'string' || !code.trim()) {
      throw new BadRequestException('Cần cung cấp mã loại email.');
    }
    const emailType = await this.prismaService.emailTypes.findUnique({
      where: { code: code.trim() },
      include: { defaultRecipients: true },
    });
    if (!emailType) throw new NotFoundException('Không tìm thấy loại email.');
    return this.normalizeEmails(emailType.defaultRecipients?.email ?? '');
  }

  async resolveRecipients(
    code: string,
    userId: number | null | undefined,
  ): Promise<string[]> {
    this.ensureUserId(userId);
    if (typeof code !== 'string' || !code.trim()) {
      throw new BadRequestException('Cần cung cấp mã loại email.');
    }
    if (code.trim() === EMAIL_TYPE_CODES.PRODUCTION_ORDER_DEVIATION_CREATED) {
      const recipients = await this.resolveDefaultRecipients(code);
      if (!recipients.length) {
        throw new BadRequestException(
          'Chưa cấu hình người nhận email mặc định cho phiếu sai lệch.',
        );
      }
      return recipients;
    }
    const emailType = await this.prismaService.emailTypes.findUnique({
      where: { code: code.trim() },
      include: {
        defaultRecipients: true,
        userRecipients: { where: { user_id: userId } },
      },
    });
    if (!emailType) throw new NotFoundException('Không tìm thấy loại email.');

    const personal = this.normalizeEmails(
      emailType.userRecipients[0]?.email ?? '',
    );
    if (personal.length) return personal;

    const defaults = this.normalizeEmails(
      emailType.defaultRecipients?.email ?? '',
    );
    if (defaults.length) return defaults;

    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const self = this.normalizeEmails(user?.email ?? '');
    if (!self.length) {
      throw new BadRequestException(
        'Chưa cấu hình người nhận và tài khoản của bạn chưa có email.',
      );
    }
    return self;
  }

  private normalizeEmails(value: string): string[] {
    if (typeof value !== 'string') {
      throw new BadRequestException('Danh sách email phải là chuỗi.');
    }
    const seen = new Set<string>();
    const emails = value
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    const unique = emails.filter((email) => {
      if (!isEmail(email))
        throw new BadRequestException(`Địa chỉ email không hợp lệ: ${email}`);
      const key = email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (Buffer.byteLength(unique.join(','), 'utf8') > 65535) {
      throw new BadRequestException(
        'Danh sách email vượt quá dung lượng cho phép.',
      );
    }
    return unique;
  }

  private normalizeName(value: string) {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > 255
    ) {
      throw new BadRequestException(
        'Tên loại email phải có từ 1 đến 255 ký tự.',
      );
    }
    return value.trim();
  }

  private ensureUserId(
    userId: number | null | undefined,
  ): asserts userId is number {
    if (!Number.isInteger(userId) || !userId || userId <= 0) {
      throw new UnauthorizedException('Không xác định được người thao tác.');
    }
  }

  private async ensureTypeExists(id: number) {
    const emailType = await this.prismaService.emailTypes.findUnique({
      where: { id },
    });
    if (!emailType) throw new NotFoundException('Không tìm thấy loại email.');
    return emailType;
  }
}
