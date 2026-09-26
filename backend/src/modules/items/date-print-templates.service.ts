import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateDatePrintTemplateDto } from './dto/create-date-print-template.dto';
import { UpdateDatePrintTemplateDto } from './dto/update-date-print-template.dto';
import {
  getDatePrintTemplateImageLookupPaths,
  removeDatePrintTemplateImageByPath,
  resolveDatePrintTemplateImageFile,
} from './date-print-template-image-upload.config';

type AuthenticatedUser = { id?: number | string | null };

const ACTIVE_DATE_PRINT_TEMPLATE_STATUS = 'active';
const INACTIVE_DATE_PRINT_TEMPLATE_STATUS = 'inactive';

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const datePrintTemplateInclude = {
  item: {
    select: {
      item_code: true,
      item_name: true,
      unit: true,
      dk_code: true,
      registration_id: true,
      created_at: true,
      update_at: true,
    },
  },
  createdBy: { select: creatorSelect },
} satisfies Prisma.DatePrintTemplatesInclude;

@Injectable()
export class DatePrintTemplatesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.datePrintTemplates.findMany({
      include: datePrintTemplateInclude,
      orderBy: [{ item_code: 'asc' }, { version: 'desc' }, { id: 'desc' }],
    });
  }

  async findAllByItem(itemCode: string) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    await this.ensureItemExists(normalizedItemCode);

    return this.prismaService.datePrintTemplates.findMany({
      where: { item_code: normalizedItemCode },
      include: datePrintTemplateInclude,
      orderBy: [{ version: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    const template = await this.prismaService.datePrintTemplates.findUnique({
      where: { id },
      include: datePrintTemplateInclude,
    });

    if (!template) {
      throw new NotFoundException('Date print template not found');
    }

    return template;
  }

  async findImageFile(filename: string, original = false) {
    const imagePaths = getDatePrintTemplateImageLookupPaths(filename);
    if (imagePaths.length === 0) {
      return null;
    }

    const template = await this.prismaService.datePrintTemplates.findFirst({
      where: { image_path: { in: imagePaths } },
      select: { id: true },
    });
    if (!template) {
      return null;
    }

    return resolveDatePrintTemplateImageFile(filename, original);
  }

  async create(
    itemCode: string,
    dto: CreateDatePrintTemplateDto,
    user?: AuthenticatedUser,
  ) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    const version = this.normalizePositiveInteger(dto?.version ?? 1, 'version');
    await this.ensureItemExists(normalizedItemCode);
    await this.ensureVersionIsAvailable(normalizedItemCode, version);

    return this.prismaService.datePrintTemplates.create({
      data: {
        item_code: normalizedItemCode,
        manufacturing_date_format: this.normalizeDateFormat(dto?.manufacturing_date_format),
        expiry_date_format: this.normalizeDateFormat(dto?.expiry_date_format),
        version,
        description: this.normalizeDescription(dto?.description),
        print_content: this.normalizeRequiredText(
          dto?.print_content,
          'print_content',
        ),
        print_position: this.normalizePrintPosition(dto?.print_position),
        status: ACTIVE_DATE_PRINT_TEMPLATE_STATUS,
        created_by_id: this.normalizeUserId(user),
      },
      include: datePrintTemplateInclude,
    });
  }

  async update(id: number, dto: UpdateDatePrintTemplateDto) {
    const template = await this.findById(id);
    const data = this.normalizeUpdateData(dto);
    const updateDto = dto ?? {};

    if ('version' in updateDto) {
      await this.ensureVersionIsAvailable(
        template.item_code,
        this.normalizePositiveInteger(updateDto.version, 'version'),
        id,
      );
    }

    return this.prismaService.datePrintTemplates.update({
      where: { id },
      data,
      include: datePrintTemplateInclude,
    });
  }

  async uploadImage(id: number, imagePath: string) {
    const template = await this.findById(id);
    const updatedTemplate = await this.prismaService.datePrintTemplates.update({
      where: { id },
      data: { image_path: imagePath },
      include: datePrintTemplateInclude,
    });

    if (template.image_path && template.image_path !== imagePath) {
      await removeDatePrintTemplateImageByPath(template.image_path);
    }

    return updatedTemplate;
  }

  async deleteImage(id: number) {
    const template = await this.findById(id);
    if (!template.image_path) {
      throw new NotFoundException('Date print template image not found');
    }

    const updatedTemplate = await this.prismaService.datePrintTemplates.update({
      where: { id },
      data: { image_path: null },
      include: datePrintTemplateInclude,
    });
    await removeDatePrintTemplateImageByPath(template.image_path);

    return updatedTemplate;
  }

  async delete(id: number) {
    const template = await this.findById(id);
    await this.prismaService.datePrintTemplates.delete({ where: { id } });
    await removeDatePrintTemplateImageByPath(template.image_path);

    return template;
  }

  private normalizeUpdateData(dto: UpdateDatePrintTemplateDto) {
    const updateDto = dto ?? {};
    const data: Prisma.DatePrintTemplatesUpdateInput = {};
    if ('manufacturing_date_format' in updateDto) {
      data.manufacturing_date_format = this.normalizeDateFormat(updateDto.manufacturing_date_format);
    }
    if ('expiry_date_format' in updateDto) {
      data.expiry_date_format = this.normalizeDateFormat(updateDto.expiry_date_format);
    }

    if ('version' in updateDto) {
      data.version = this.normalizePositiveInteger(
        updateDto.version,
        'version',
      );
    }

    if ('description' in updateDto) {
      data.description = this.normalizeDescription(updateDto.description);
    }

    if ('print_content' in updateDto) {
      data.print_content = this.normalizeRequiredText(
        updateDto.print_content,
        'print_content',
      );
    }

    if ('print_position' in updateDto) {
      data.print_position = this.normalizePrintPosition(
        updateDto.print_position,
      );
    }

    if ('status' in updateDto) {
      data.status = this.normalizeStatus(updateDto.status);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeDateFormat(value: unknown) {
    if (value == null) return null;
    if (typeof value !== 'string') throw new BadRequestException('Định dạng ngày phải là chuỗi.');
    return value.trim() || null;
  }

  private normalizeItemCode(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('item_code is required');
    }

    return value.trim();
  }

  private normalizePositiveInteger(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);
    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalizedValue;
  }

  private normalizeDescription(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = String(value).trim();
    return normalizedValue || null;
  }

  private normalizePrintPosition(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = String(value).trim();
    if (normalizedValue.length > 255) {
      throw new BadRequestException(
        'print_position must not exceed 255 characters',
      );
    }

    return normalizedValue || null;
  }

  private normalizeStatus(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException('status must be active or inactive');
    }

    const normalizedValue = value.trim().toLowerCase();
    if (
      normalizedValue !== ACTIVE_DATE_PRINT_TEMPLATE_STATUS &&
      normalizedValue !== INACTIVE_DATE_PRINT_TEMPLATE_STATUS
    ) {
      throw new BadRequestException('status must be active or inactive');
    }

    return normalizedValue;
  }

  private async ensureVersionIsAvailable(
    itemCode: string,
    version: number,
    excludedTemplateId?: number,
  ) {
    const existingTemplate =
      await this.prismaService.datePrintTemplates.findFirst({
        where: {
          item_code: itemCode,
          version,
          ...(excludedTemplateId === undefined
            ? {}
            : { id: { not: excludedTemplateId } }),
        },
        select: { id: true },
      });

    if (existingTemplate) {
      throw new ConflictException(
        'A date print template already exists for this item and version',
      );
    }
  }

  private async ensureItemExists(itemCode: string) {
    const item = await this.prismaService.items.findUnique({
      where: { item_code: itemCode },
      select: { item_code: true },
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
