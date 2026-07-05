import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

const PERMISSION_INCLUDE = {
  rolePermissions: {
    include: {
      roles: true,
    },
  },
} satisfies Prisma.PermissionsInclude;

@Injectable()
export class PermissionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.permissions.findMany({
      include: PERMISSION_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    const permission = await this.prismaService.permissions.findUnique({
      where: { id },
      include: PERMISSION_INCLUDE,
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async create(createPermissionDto: CreatePermissionDto) {
    const data = this.buildCreateData(createPermissionDto);
    await this.ensureNameIsAvailable(data.name);

    return this.prismaService.permissions.create({
      data,
      include: PERMISSION_INCLUDE,
    });
  }

  async update(id: number, updatePermissionDto: UpdatePermissionDto) {
    await this.findById(id);
    const data = await this.buildUpdateData(id, updatePermissionDto);

    return this.prismaService.permissions.update({
      where: { id },
      data,
      include: PERMISSION_INCLUDE,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.permissions.delete({
      where: { id },
      include: PERMISSION_INCLUDE,
    });
  }

  private buildCreateData(
    dto: CreatePermissionDto,
  ): Prisma.PermissionsUncheckedCreateInput {
    return {
      name: this.normalizeRequiredString(dto.name, 'name'),
      description: this.normalizeOptionalString(dto.description, 'description'),
    };
  }

  private async buildUpdateData(
    id: number,
    dto: UpdatePermissionDto,
  ): Promise<Prisma.PermissionsUncheckedUpdateInput> {
    const data: Prisma.PermissionsUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      const name = this.normalizeRequiredString(dto.name, 'name');
      await this.ensureNameIsAvailable(name, id);
      data.name = name;
    }

    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        dto.description,
        'description',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private async ensureNameIsAvailable(name: string, currentId?: number) {
    const existing = await this.prismaService.permissions.findUnique({
      where: { name },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Permission name already exists');
    }
  }

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeOptionalString(value: unknown, fieldName: string) {
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
    return normalizedValue === '' ? null : normalizedValue;
  }
}
