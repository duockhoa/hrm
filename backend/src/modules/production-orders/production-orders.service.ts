import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ProductionOrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.productionOrders.findMany({
      include: {
        item: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findProductionOrderById(id: number) {
    return this.prismaService.productionOrders.findUnique({
      where: {
        id,
      },
      include: {
        item: true,
      },
    });
  }
}
