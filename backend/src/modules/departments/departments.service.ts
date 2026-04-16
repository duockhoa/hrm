import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() {
    return this.prisma.departments.findMany();
  }

  async findByName(name: string) {
    return this.prisma.departments.findUnique({
      where: { name: name },
      include: { users: true },
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
}
