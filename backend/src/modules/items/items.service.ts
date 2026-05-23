import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
@Injectable()
export class ItemsService {
  constructor(private readonly prismaService: PrismaService) {}
  async findAll() {
    return this.prismaService.items.findMany();
  }

  async findFinishedProducts() {
    return this.prismaService.items.findMany({
      where: {
        item_code: {
          startsWith: 'TP',
        },
      },
    });
  }
  async findSemiFinishedProducts() {
    return this.prismaService.items.findMany({
      where: {
        item_code: {
          startsWith: 'BTP',
        },
      },
    });
  }
  async findRawMaterials() {
    return this.prismaService.items.findMany({
      where: {
        NOT: [
          { item_code: { startsWith: 'TP' } },
          { item_code: { startsWith: 'BTP' } },
        ],
      },
    });
  }

  async findItemByCode(item_code: string) {
    const item = await this.prismaService.items.findUnique({
      where: {
        item_code: item_code,
      },
      include: {
        productionSpecification: true,
      },
    });

    if (item?.productionSpecification?.deleted_at) {
      return {
        ...item,
        productionSpecification: null,
      };
    }

    return item;
  }
}
