import { Injectable } from '@nestjs/common';
import { create } from 'domain';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() {
    return this.prisma.departments.findMany();
  }

  async findByName(name: string) {
    console.log('Finding department by name:', name);
    return this.prisma.departments.findUnique({
      where: { name: name },
    });
  }
  async create(createDepartmentDto: any) {
    const newDepartment = await this.prisma.departments.create({
      data: createDepartmentDto,
    });
    return newDepartment;
  }
}
