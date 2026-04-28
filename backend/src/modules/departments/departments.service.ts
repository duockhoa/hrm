import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNames } from 'src/event.interface';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
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
    this.eventEmitter.emit(EventNames.DEPARTMENT_SYNCED, newDepartment);
    return newDepartment;
  }
  async delete(name: string) {
    const department = await this.prisma.departments.findUnique({
      where: { name: name },
    });
    const deletedDepartment = await this.prisma.departments.delete({
      where: { name: name },
    });
    this.eventEmitter.emit(EventNames.DEPARTMENT_SYNCED, deletedDepartment);
    return deletedDepartment;
  }
  async update(name: string, updateDepartmentDto: any) {
    const updatedDepartment = await this.prisma.departments.update({
      where: { name: name },
      data: updateDepartmentDto,
    });
    this.eventEmitter.emit(EventNames.DEPARTMENT_SYNCED, updatedDepartment);
    return updatedDepartment;
  }
}
