import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() {
    return this.prisma.company.findMany({
      where: { deleted_at: null },
      include: { leader: true },
    });
  }
  async findById(id: number) {
    return this.prisma.company.findUnique({
      where: { id: id },
      include: { leader: true },
    });
  }
  async create(createCompanyDto: any) {
    const newCompany = await this.prisma.company.create({
      data: createCompanyDto,
    });
    return newCompany;
  }
  async delete(id: number) {
    return this.prisma.company.delete({
      where: { id: id },
    });
  }
  async update(id: number, updateCompanyDto: any) {
    return this.prisma.company.update({
      where: { id: id },
      data: updateCompanyDto,
    });
  }
}
