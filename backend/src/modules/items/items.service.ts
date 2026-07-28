import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

const ITEM_INCLUDE = {
  productionSpecification: {
    include: {
      productLine: true,
      updatedBy: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          department: true,
          position: true,
        },
      },
    },
  },
};

@Injectable()
export class ItemsService {
  constructor(private readonly prismaService: PrismaService) {}
  async findAll() {
    const items = await this.prismaService.items.findMany({
      include: ITEM_INCLUDE,
    });

    return items.map((item) => this.hideDeletedProductionSpecification(item));
  }

  async findFinishedProducts() {
    const items = await this.prismaService.items.findMany({
      where: {
        item_code: {
          startsWith: 'TP',
        },
      },
      include: ITEM_INCLUDE,
    });

    return items.map((item) => this.hideDeletedProductionSpecification(item));
  }
  async findSemiFinishedProducts() {
    const items = await this.prismaService.items.findMany({
      where: {
        item_code: {
          startsWith: 'BTP',
        },
      },
      include: ITEM_INCLUDE,
    });

    return items.map((item) => this.hideDeletedProductionSpecification(item));
  }
  async findRawMaterials() {
    const items = await this.prismaService.items.findMany({
      where: {
        NOT: [
          { item_code: { startsWith: 'TP' } },
          { item_code: { startsWith: 'BTP' } },
        ],
      },
      include: ITEM_INCLUDE,
    });

    return items.map((item) => this.hideDeletedProductionSpecification(item));
  }

  async findItemByCode(item_code: string) {
    const item = await this.prismaService.items.findUnique({
      where: {
        item_code: item_code,
      },
      include: ITEM_INCLUDE,
    });

    return this.hideDeletedProductionSpecification(item);
  }

  private hideDeletedProductionSpecification<
    T extends {
      productionSpecification?: { deleted_at?: Date | null } | null;
    } | null,
  >(item: T) {
    if (item?.productionSpecification?.deleted_at) {
      return {
        ...item,
        productionSpecification: null,
      };
    }

    return item;
  }
}
