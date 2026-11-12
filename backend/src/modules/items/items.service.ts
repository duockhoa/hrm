import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UpdateItemDto } from './dto/update-item.dto';
import { Prisma } from '@prisma/client';
import { ListItemsQuery, parseItemsQuery } from './dto/list-items-query';

const ITEM_INCLUDE = {
  registration: true,
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
  async findAllSeries() {
    return this.prismaService.sapItemSeries.findMany({
      orderBy: { series: 'asc' },
    });
  }

  async findSeriesById(series: number) {
    const itemSeries = await this.prismaService.sapItemSeries.findUnique({
      where: { series },
    });
    if (!itemSeries) throw new NotFoundException('Item series not found');
    return itemSeries;
  }

  async findAll(
    query: ListItemsQuery | string = {},
    onCount?: (total: number) => void,
  ) {
    return this.listItems(
      typeof query === 'string' ? { codePrefix: query } : query,
      {},
      onCount,
    );
  }

  async findFinishedProducts(
    query: ListItemsQuery = {},
    onCount?: (total: number) => void,
  ) {
    return this.listItems(query, { item_code: { startsWith: 'TP' } }, onCount);
  }
  async findSemiFinishedProducts(
    query: ListItemsQuery = {},
    onCount?: (total: number) => void,
  ) {
    return this.listItems(query, { item_code: { startsWith: 'BTP' } }, onCount);
  }
  async findRawMaterials(
    query: ListItemsQuery = {},
    onCount?: (total: number) => void,
  ) {
    return this.listItems(
      query,
      {
        NOT: [
          { item_code: { startsWith: 'TP' } },
          { item_code: { startsWith: 'BTP' } },
        ],
      },
      onCount,
    );
  }

  private async listItems(
    input: ListItemsQuery,
    scope: Prisma.ItemsWhereInput,
    onCount?: (total: number) => void,
  ) {
    const query = parseItemsQuery(input);
    const conditions: Prisma.ItemsWhereInput[] = [];
    if (Object.keys(scope).length) conditions.push(scope);
    if (query.codePrefix)
      conditions.push({ item_code: { startsWith: query.codePrefix } });
    if (query.search) {
      conditions.push({
        OR: [
          { item_code: { contains: query.search } },
          { item_name: { contains: query.search } },
          { dk_code: { contains: query.search } },
        ],
      });
    }
    if (query.series) conditions.push({ series: { in: query.series } });
    if (query.registrationId !== undefined)
      conditions.push({ registration_id: query.registrationId });
    if (query.hasRegistration !== undefined)
      conditions.push({
        registration_id: query.hasRegistration ? { not: null } : null,
      });
    const where = conditions.length > 1 ? { AND: conditions } : conditions[0];
    const relations: Prisma.ItemsInclude = {};
    const expansions =
      query.expand ??
      (query.select ? [] : ['registration', 'productionSpecification']);
    for (const name of expansions) {
      if (name === 'registration')
        relations.registration = ITEM_INCLUDE.registration;
      if (name === 'productionSpecification')
        relations.productionSpecification =
          ITEM_INCLUDE.productionSpecification;
    }
    const projection: Pick<Prisma.ItemsFindManyArgs, 'select' | 'include'> =
      query.select
        ? {
            select: {
              ...Object.fromEntries(query.select.map((field) => [field, true])),
              ...relations,
            },
          }
        : { include: relations };
    const args: Prisma.ItemsFindManyArgs = {
      ...(where ? { where } : {}),
      ...(query.skip !== undefined ? { skip: query.skip } : {}),
      ...(query.top !== undefined ? { take: query.top } : {}),
      orderBy: query.orderBy.map(({ field, direction }) => ({
        [field]: direction,
      })),
      ...projection,
    };
    const [items, total] = await Promise.all([
      this.prismaService.items.findMany(args),
      query.count
        ? this.prismaService.items.count({ ...(where ? { where } : {}) })
        : undefined,
    ]);
    if (total !== undefined) onCount?.(total);
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

  async update(item_code: string, dto: UpdateItemDto) {
    await this.ensureItemExists(item_code);
    const data = await this.buildUpdateData(dto);

    return this.prismaService.items.update({
      where: {
        item_code,
      },
      data,
      include: ITEM_INCLUDE,
    });
  }

  private async ensureItemExists(item_code: string) {
    const item = await this.prismaService.items.findUnique({
      where: {
        item_code,
      },
      select: {
        item_code: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }
  }

  private async buildUpdateData(dto: UpdateItemDto) {
    if (!('registration_id' in dto)) {
      throw new BadRequestException('No update data provided');
    }

    const registration_id = await this.normalizeRegistrationId(
      dto.registration_id,
    );

    return {
      registration_id,
    };
  }

  private async normalizeRegistrationId(value: unknown) {
    if (value === null || value === '') {
      return null;
    }

    if (value === undefined) {
      throw new BadRequestException('registration_id is required');
    }

    const registrationId = Number(value);

    if (!Number.isInteger(registrationId) || registrationId <= 0) {
      throw new BadRequestException(
        'registration_id must be a positive integer',
      );
    }

    const registrationNumber =
      await this.prismaService.registrationNumbers.findUnique({
        where: {
          id: registrationId,
        },
        select: {
          id: true,
        },
      });

    if (!registrationNumber) {
      throw new NotFoundException('Registration number not found');
    }

    return registrationId;
  }

  private hideDeletedProductionSpecification<T extends object | null>(item: T) {
    const specification =
      item && 'productionSpecification' in item
        ? (item.productionSpecification as { deleted_at?: Date | null } | null)
        : null;
    if (specification?.deleted_at) {
      return {
        ...item,
        productionSpecification: null,
      };
    }

    return item;
  }
}
