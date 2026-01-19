import { Injectable, UseInterceptors, UploadedFile } from '@nestjs/common';
import { compareSync, hash } from 'bcrypt';
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.users.findMany();
  }

  findById(id: number) {
    return this.prisma.users.findUnique({
      where: { id },
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
  }

  async createUser(createUserDto: CreateUserDto) {
    const data = {
      ...createUserDto,
      password: await hash(createUserDto.password, 10),
    };
    const newUser = await this.prisma.users.create({
      data,
    });
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
}
