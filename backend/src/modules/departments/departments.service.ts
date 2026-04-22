import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() {
    return this.prisma.departments.findMany({
      include: {
        users: {
          where: { deleted_at: null },
        },
        team_lead_user: {
          where: { deleted_at: null },
        },
        company: {
          where: { deleted_at: null },
        },
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.departments.findUnique({
      where: { name: name, deleted_at: null },
      include: {
        users: {
          where: { deleted_at: null },
        },
        company: {
          where: { deleted_at: null },
        },
        team_lead_user: {
          where: { deleted_at: null },
        },
      },
    });
  }
  async create(createDepartmentDto: any) {
    const newDepartment = await this.prisma.departments.create({
      data: createDepartmentDto,
    });
    return newDepartment;
  }
  async delete(name: string) {
    return this.prisma.departments.delete({
      where: { name: name },
    });
  }
  async update(name: string, updateDepartmentDto: any) {
    return this.prisma.departments.update({
      where: { name: name },
      data: updateDepartmentDto,
    });
  }
}
