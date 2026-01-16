import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() {
    return this.prisma.roles.findMany({
      include: { rolePermissions: { include: { permissions: true } } },
    });
  }
  async createRole(roleName: string, description?: string) {
    const newRole = await this.prisma.roles.create({
      data: { name: roleName, description },
    });
    return newRole;
  }
  async deleteRole(id: number) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) {
      return null;
    }
    const deleteResponse = await this.prisma.roles.delete({ where: { id } });
    if (!deleteResponse) {
      return null;
    }
    return role;
  }

  async addPermissionToRole(roleId: number, permissionId: number) {
    const role = await this.prisma.roles.findUnique({ where: { id: roleId } });
    const permission = await this.prisma.permissions.findUnique({
      where: { id: permissionId },
    });
    if (!role || !permission) {
      return null;
    }
    const rolePermission = await this.prisma.rolePermissions.create({
      data: {
        role_id: roleId,
        permission_id: permissionId,
      },
    });
    return rolePermission;
  }

  async removePermissionFromRole(roleId: number, permissionId: number) {
    const rolePermission = await this.prisma.rolePermissions.findFirst({
      where: {
        role_id: roleId,
        permission_id: permissionId,
      },
    });
    if (!rolePermission) {
      return null;
    }
    await this.prisma.rolePermissions.delete({
      where: { id: rolePermission.id },
    });
    return rolePermission;
  }
}
