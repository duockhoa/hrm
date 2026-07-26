import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { compareSync, hash } from 'bcrypt';
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNames } from 'src/event.interface';
import { EmailService } from '../email/email.service';

const USER_ROLE_INCLUDE = {
  roles: {
    include: {
      rolePermissions: {
        include: {
          permissions: true,
        },
      },
    },
  },
} satisfies Prisma.UserRolesInclude;

const APPLICATION_ORDER_BY = [
  { default_order: 'asc' },
  { name: 'asc' },
  { id: 'asc' },
] satisfies Prisma.ApplicationsOrderByWithRelationInput[];

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private emailService: EmailService,
  ) {}

  async findAll() {
    return this.prisma.users.findMany();
  }

  async findAllWithDeleted() {
    return this.prisma.users.findMany({
      withDeleted: true,
    } as any);
  }

  findById(id: number) {
    return this.prisma.users.findUnique({
      where: { id: id },
      include: {
        userRoles: {
          include: {
            roles: {
              include: { rolePermissions: { include: { permissions: true } } },
            },
          },
        },
        departmentObj: true,
      },
    });
  }

  async createUser(createUserDto: CreateUserDto) {
    const data = {
      ...createUserDto,
      password: await hash(createUserDto.password, 10),
    };
    const newUser = await this.prisma.users.create({
      data,
    });
    this.eventEmitter.emit(EventNames.USER_SYNCED, newUser);
    return newUser;
  }

  async deleteUser(id: number) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) {
      return null;
    }
    const deleteResponse = await this.prisma.users.delete({ where: { id } });
    if (!deleteResponse) {
      return null;
    }
    this.eventEmitter.emit(EventNames.USER_SYNCED, user);
    return user;
  }

  async updateUser(id: number, updateUserDto: Partial<CreateUserDto>) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) {
      return null;
    }
    const updatedUser = await this.prisma.users.update({
      where: { id },
      data: updateUserDto,
    });

    this.eventEmitter.emit(EventNames.USER_SYNCED, updatedUser);
    return updatedUser;
  }

  async uploadAvatar(id: number, avatarUrl: string) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) {
      return null;
    }
    const updatedUser = await this.prisma.users.update({
      where: { id },
      data: { avatar: avatarUrl },
    });
    return updatedUser;
  }

  async changePassword(oldPassword: string, newPassword: string, user: any) {
    if (!compareSync(oldPassword, user.password)) {
      return null;
    }
    const hashedPassword = await hash(newPassword, 10);
    await this.prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    return hashedPassword;
  }

  async findRolesByUserId(userId: number) {
    await this.ensureUserExists(userId);

    return this.prisma.userRoles.findMany({
      where: { user_id: userId },
      include: USER_ROLE_INCLUDE,
      orderBy: { id: 'asc' },
    });
  }

  async addRoleToUser(userId: number, roleId: number) {
    return this.addRolesToUser(userId, [roleId]);
  }

  async addRolesToUser(userId: number, roleIds: number[]) {
    await this.ensureUserExists(userId);
    const normalizedRoleIds = this.normalizeIds(roleIds, 'roleIds', false);
    await this.ensureRolesExist(normalizedRoleIds);

    const existingUserRoles = await this.prisma.userRoles.findMany({
      where: {
        user_id: userId,
        role_id: { in: normalizedRoleIds },
      },
      select: { role_id: true },
    });
    const existingRoleIds = new Set(
      existingUserRoles.map((userRole) => userRole.role_id),
    );
    const roleIdsToCreate = normalizedRoleIds.filter(
      (roleId) => !existingRoleIds.has(roleId),
    );

    if (roleIdsToCreate.length > 0) {
      await this.prisma.userRoles.createMany({
        data: roleIdsToCreate.map((roleId) => ({
          user_id: userId,
          role_id: roleId,
        })),
      });
    }

    return this.findRolesByUserId(userId);
  }

  async syncRoles(userId: number, roleIds: number[]) {
    await this.ensureUserExists(userId);
    const normalizedRoleIds = this.normalizeIds(roleIds, 'roleIds', true);
    await this.ensureRolesExist(normalizedRoleIds);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.userRoles.deleteMany({
        where: { user_id: userId },
      });

      if (normalizedRoleIds.length === 0) {
        return;
      }

      await prisma.userRoles.createMany({
        data: normalizedRoleIds.map((roleId) => ({
          user_id: userId,
          role_id: roleId,
        })),
      });
    });

    return this.findRolesByUserId(userId);
  }

  async removeRoleFromUser(userId: number, roleId: number) {
    await this.ensureUserExists(userId);

    const deleteResult = await this.prisma.userRoles.deleteMany({
      where: {
        user_id: userId,
        role_id: roleId,
      },
    });

    if (deleteResult.count === 0) {
      throw new NotFoundException('User role not found');
    }

    return this.findRolesByUserId(userId);
  }

  async findApplicationsByUserId(userId: number) {
    await this.ensureUserExists(userId);

    return this.prisma.applications.findMany({
      where: {
        is_active: true,
        userApplications: {
          some: {
            user_id: userId,
          },
        },
      },
      orderBy: APPLICATION_ORDER_BY,
    });
  }

  async syncApplications(userId: number, applicationIds: number[]) {
    await this.ensureUserExists(userId);
    const normalizedApplicationIds = this.normalizeIds(
      applicationIds,
      'applicationIds',
      true,
    );
    await this.ensureApplicationsExist(normalizedApplicationIds);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.userApplications.deleteMany({
        where: { user_id: userId },
      });

      if (normalizedApplicationIds.length === 0) {
        return;
      }

      await prisma.userApplications.createMany({
        data: normalizedApplicationIds.map((applicationId) => ({
          user_id: userId,
          application_id: applicationId,
        })),
      });
    });

    return this.findApplicationsByUserId(userId);
  }

  findByUsername(username: string) {
    const user = this.prisma.users.findUnique({ where: { username } });
    if (!user) {
      return null;
    }
    return user;
  }

  async validateUser(username: string, password: string) {
    const user = await this.prisma.users.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            roles: {
              include: { rolePermissions: { include: { permissions: true } } },
            },
          },
        },
      },
    });
    if (user && compareSync(password, user.password)) {
      return user;
    }
    return null;
  }

  private async ensureUserExists(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private async ensureRolesExist(roleIds: number[]) {
    if (roleIds.length === 0) {
      return;
    }

    const roles = await this.prisma.roles.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    const existingRoleIds = new Set(roles.map((role) => role.id));
    const missingRoleIds = roleIds.filter(
      (roleId) => !existingRoleIds.has(roleId),
    );

    if (missingRoleIds.length > 0) {
      throw new NotFoundException(
        `Roles not found: ${missingRoleIds.join(', ')}`,
      );
    }
  }

  private async ensureApplicationsExist(applicationIds: number[]) {
    if (applicationIds.length === 0) {
      return;
    }

    const applications = await this.prisma.applications.findMany({
      where: { id: { in: applicationIds } },
      select: { id: true },
    });
    const existingApplicationIds = new Set(
      applications.map((application) => application.id),
    );
    const missingApplicationIds = applicationIds.filter(
      (applicationId) => !existingApplicationIds.has(applicationId),
    );

    if (missingApplicationIds.length > 0) {
      throw new NotFoundException(
        `Applications not found: ${missingApplicationIds.join(', ')}`,
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
}
