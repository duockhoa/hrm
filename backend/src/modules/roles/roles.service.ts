import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const ROLE_INCLUDE = {
  rolePermissions: {
    include: {
      permissions: true,
    },
  },
} satisfies Prisma.RolesInclude;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.roles.findMany({
      include: ROLE_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    const role = await this.prisma.roles.findUnique({
      where: { id },
      include: ROLE_INCLUDE,
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async create(dto: CreateRoleDto) {
    const data = this.buildCreateData(dto);
    await this.ensureNameIsAvailable(data.name);

    return this.prisma.roles.create({
      data,
      include: ROLE_INCLUDE,
    });
  }

  async createRole(roleName: string, description?: string | null) {
    return this.create({ roleName, description });
  }

  async update(id: number, dto: UpdateRoleDto) {
    await this.findById(id);
    const data = await this.buildUpdateData(id, dto);

    return this.prisma.roles.update({
      where: { id },
      data,
      include: ROLE_INCLUDE,
    });
  }

  async deleteRole(id: number) {
    await this.findById(id);

    return this.prisma.roles.delete({
      where: { id },
      include: ROLE_INCLUDE,
    });
  }

  async addPermissionToRole(roleId: number, permissionId: number) {
    return this.addPermissionsToRole(roleId, [permissionId]);
  }

  async addPermissionsToRole(roleId: number, permissionIds: number[]) {
    await this.findById(roleId);
    const normalizedPermissionIds = this.normalizeIds(
      permissionIds,
      'permissionIds',
      false,
    );
    await this.ensurePermissionsExist(normalizedPermissionIds);

    const existingRolePermissions = await this.prisma.rolePermissions.findMany({
      where: {
        role_id: roleId,
        permission_id: { in: normalizedPermissionIds },
      },
      select: { permission_id: true },
    });
    const existingPermissionIds = new Set(
      existingRolePermissions.map(
        (rolePermission) => rolePermission.permission_id,
      ),
    );
    const permissionIdsToCreate = normalizedPermissionIds.filter(
      (permissionId) => !existingPermissionIds.has(permissionId),
    );

    if (permissionIdsToCreate.length > 0) {
      await this.prisma.rolePermissions.createMany({
        data: permissionIdsToCreate.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
        })),
      });
    }

    return this.findById(roleId);
  }

  async syncPermissions(roleId: number, permissionIds: number[]) {
    await this.findById(roleId);
    const normalizedPermissionIds = this.normalizeIds(
      permissionIds,
      'permissionIds',
      true,
    );
    await this.ensurePermissionsExist(normalizedPermissionIds);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.rolePermissions.deleteMany({
        where: { role_id: roleId },
      });

      if (normalizedPermissionIds.length === 0) {
        return;
      }

      await prisma.rolePermissions.createMany({
        data: normalizedPermissionIds.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
        })),
      });
    });

    return this.findById(roleId);
  }

  async removePermissionFromRole(roleId: number, permissionId: number) {
    await this.findById(roleId);

    const deleteResult = await this.prisma.rolePermissions.deleteMany({
      where: {
        role_id: roleId,
        permission_id: permissionId,
      },
    });

    if (deleteResult.count === 0) {
      throw new NotFoundException('Role permission not found');
    }

    return this.findById(roleId);
  }

  private buildCreateData(
    dto: CreateRoleDto,
  ): Prisma.RolesUncheckedCreateInput {
    return {
      name: this.normalizeRoleName(dto),
      description: this.normalizeOptionalString(dto.description, 'description'),
    };
  }

  private async buildUpdateData(
    id: number,
    dto: UpdateRoleDto,
  ): Promise<Prisma.RolesUncheckedUpdateInput> {
    const data: Prisma.RolesUncheckedUpdateInput = {};

    if (dto.name !== undefined || dto.roleName !== undefined) {
      const name = this.normalizeRoleName(dto);
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

  private normalizeRoleName(dto: CreateRoleDto | UpdateRoleDto) {
    const name = dto.name ?? dto.roleName;
    return this.normalizeRequiredString(name, 'name');
  }

  private async ensureNameIsAvailable(name: string, currentId?: number) {
    const existing = await this.prisma.roles.findUnique({
      where: { name },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Role name already exists');
    }
  }

  private async ensurePermissionsExist(permissionIds: number[]) {
    if (permissionIds.length === 0) {
      return;
    }

    const permissions = await this.prisma.permissions.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    const existingPermissionIds = new Set(
      permissions.map((permission) => permission.id),
    );
    const missingPermissionIds = permissionIds.filter(
      (permissionId) => !existingPermissionIds.has(permissionId),
    );

    if (missingPermissionIds.length > 0) {
      throw new NotFoundException(
        `Permissions not found: ${missingPermissionIds.join(', ')}`,
      );
    }
  }

  private normalizeIds(ids: number[], fieldName: string, allowEmpty: boolean) {
    if (!Array.isArray(ids)) {
      throw new BadRequestException(`${fieldName} must be an array`);
    }

    const normalizedIds = [
      ...new Set(
        ids.map((id) => {
          const normalizedId = Number(id);
          if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
            throw new BadRequestException(
              `${fieldName} must contain positive integers`,
            );
          }

          return normalizedId;
        }),
      ),
    ];

    if (!allowEmpty && normalizedIds.length === 0) {
      throw new BadRequestException(`${fieldName} must not be empty`);
    }

    return normalizedIds;
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
