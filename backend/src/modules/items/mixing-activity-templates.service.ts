import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateMixingActivityTemplateDto } from './dto/create-mixing-activity-template.dto';
import { UpdateMixingActivityTemplateDto } from './dto/update-mixing-activity-template.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const mixingActivityTemplateInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.MixingActivityTemplatesInclude;

@Injectable()
export class MixingActivityTemplatesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByItem(itemCode: string) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    await this.ensureItemExists(normalizedItemCode);

    return this.prismaService.mixingActivityTemplates.findMany({
      where: { item_code: normalizedItemCode },
      include: mixingActivityTemplateInclude,
      orderBy: [{ version: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    const template =
      await this.prismaService.mixingActivityTemplates.findUnique({
        where: { id },
        include: mixingActivityTemplateInclude,
      });

    if (!template) {
      throw new NotFoundException('Mixing activity template not found');
    }

    return template;
  }

  async create(
    itemCode: string,
    dto: CreateMixingActivityTemplateDto,
    user?: AuthenticatedUser,
  ) {
    const normalizedItemCode = this.normalizeItemCode(itemCode);
    await this.ensureItemExists(normalizedItemCode);

    return this.prismaService.mixingActivityTemplates.create({
      data: {
        item_code: normalizedItemCode,
        version: this.normalizePositiveInteger(dto?.version ?? 1, 'version'),
        batch_size: this.normalizePositiveNumber(dto?.batch_size, 'batch_size'),
        unit_of_measure: this.normalizeRequiredString(
          dto?.unit_of_measure,
          'unit_of_measure',
          50,
        ),
        description: this.normalizeDescription(dto?.description),
        created_by_id: this.normalizeUserId(user),
      },
      include: mixingActivityTemplateInclude,
    });
  }

  async update(id: number, dto: UpdateMixingActivityTemplateDto) {
    await this.findById(id);
    const data = this.normalizeUpdateData(dto);

    return this.prismaService.mixingActivityTemplates.update({
      where: { id },
      data,
      include: mixingActivityTemplateInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.mixingActivityTemplates.delete({
      where: { id },
      include: mixingActivityTemplateInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateMixingActivityTemplateDto) {
    const updateDto = dto ?? {};
    const data: Prisma.MixingActivityTemplatesUpdateInput = {};

    if ('version' in updateDto) {
      data.version = this.normalizePositiveInteger(
        updateDto.version,
        'version',
      );
    }

    if ('batch_size' in updateDto) {
      data.batch_size = this.normalizePositiveNumber(
        updateDto.batch_size,
        'batch_size',
      );
    }

    if ('unit_of_measure' in updateDto) {
      data.unit_of_measure = this.normalizeRequiredString(
        updateDto.unit_of_measure,
        'unit_of_measure',
        50,
      );
    }

    if ('description' in updateDto) {
      data.description = this.normalizeDescription(updateDto.description);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
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

  private normalizePositiveNumber(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);

    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number`);
    }

    return normalizedValue;
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
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
