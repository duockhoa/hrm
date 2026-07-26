import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(includeInactive = true) {
    return this.prismaService.applications.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: [{ default_order: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(id: number) {
    const application = await this.prismaService.applications.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async create(dto: CreateApplicationDto) {
    const data = this.buildCreateData(dto);
    await this.ensureKeyIsAvailable(data.key);

    return this.prismaService.applications.create({
      data,
    });
  }

  async update(id: number, dto: UpdateApplicationDto) {
    await this.findById(id);
    const data = await this.buildUpdateData(id, dto);

    return this.prismaService.applications.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.applications.delete({
      where: { id },
    });
  }

  private buildCreateData(
    dto: CreateApplicationDto,
  ): Prisma.ApplicationsUncheckedCreateInput {
    return {
      key: this.normalizeRequiredString(dto.key, 'key', 100),
      name: this.normalizeRequiredString(dto.name, 'name', 255),
      description: this.normalizeOptionalString(dto.description, 'description'),
      default_order: this.normalizeInteger(dto.default_order, 'default_order'),
      is_active: dto.is_active ?? true,
    };
  }

  private async buildUpdateData(
    id: number,
    dto: UpdateApplicationDto,
  ): Promise<Prisma.ApplicationsUncheckedUpdateInput> {
    const data: Prisma.ApplicationsUncheckedUpdateInput = {};

    if (dto.key !== undefined) {
      const key = this.normalizeRequiredString(dto.key, 'key', 100);
      await this.ensureKeyIsAvailable(key, id);
      data.key = key;
    }

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredString(dto.name, 'name', 255);
    }

    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        dto.description,
        'description',
      );
    }

    if (dto.default_order !== undefined) {
      data.default_order = this.normalizeInteger(
        dto.default_order,
        'default_order',
      );
    }

    if (dto.is_active !== undefined) {
      if (typeof dto.is_active !== 'boolean') {
        throw new BadRequestException('is_active must be a boolean');
      }

      data.is_active = dto.is_active;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private async ensureKeyIsAvailable(key: string, currentId?: number) {
    const existing = await this.prismaService.applications.findUnique({
      where: { key },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Application key already exists');
    }
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeOptionalString(
    value: unknown,
    fieldName: string,
    maxLength?: number,
  ) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    if (maxLength !== undefined && normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeInteger(value: unknown, fieldName: string) {
    if (value === undefined || value === null) {
      return 0;
    }

    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    return normalizedValue;
  }
}
