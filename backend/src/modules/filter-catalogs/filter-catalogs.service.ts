import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateFilterCatalogDto } from './dto/create-filter-catalog.dto';
import { UpdateFilterCatalogDto } from './dto/update-filter-catalog.dto';

type AuthenticatedUser = { id?: number | string | null };

const filterCatalogCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const filterCatalogInclude = {
  createdBy: { select: filterCatalogCreatorSelect },
} satisfies Prisma.FilterCatalogsInclude;

const filterCatalogListInclude = {
  ...filterCatalogInclude,
  _count: {
    select: {
      productionOrderFiltrationChecks: true,
    },
  },
} satisfies Prisma.FilterCatalogsInclude;

const filterCatalogUsageUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const filterCatalogDetailInclude = {
  ...filterCatalogInclude,
  productionOrderFiltrationChecks: {
    include: {
      productionOrder: {
        select: {
          id: true,
          item_code: true,
          production_order_code: true,
          lot_no: true,
        },
      },
      sterilizedBy: { select: filterCatalogUsageUserSelect },
      filteredBy: { select: filterCatalogUsageUserSelect },
      inspectedAfterFilterBy: { select: filterCatalogUsageUserSelect },
    },
    orderBy: { id: 'desc' },
  },
} satisfies Prisma.FilterCatalogsInclude;

@Injectable()
export class FilterCatalogsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    const filterCatalogs = await this.prismaService.filterCatalogs.findMany({
      include: filterCatalogListInclude,
      orderBy: [{ filter_code: 'asc' }, { id: 'asc' }],
    });

    return filterCatalogs.map(
      ({ _count, ...filterCatalog }) => ({
        ...filterCatalog,
        production_order_filtration_checks_count:
          _count.productionOrderFiltrationChecks,
      }),
    );
  }

  async findById(id: number) {
    const filterCatalog = await this.prismaService.filterCatalogs.findUnique({
      where: { id },
      include: filterCatalogDetailInclude,
    });

    if (!filterCatalog) {
      throw new NotFoundException('Filter catalog not found');
    }

    return filterCatalog;
  }

  async create(dto: CreateFilterCatalogDto, user?: AuthenticatedUser) {
    const data = this.buildCreateData(dto);
    await this.ensureFilterCodeAvailable(data.filter_code);

    return this.prismaService.filterCatalogs.create({
      data: {
        ...data,
        created_by_id: this.normalizeUserId(user),
      },
      include: filterCatalogInclude,
    });
  }

  async update(id: number, dto: UpdateFilterCatalogDto) {
    const existing = await this.findById(id);
    const data = await this.buildUpdateData(dto, id);

    return this.prismaService.filterCatalogs.update({
      where: { id },
      data,
      include: filterCatalogInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.filterCatalogs.delete({
      where: { id },
      include: filterCatalogInclude,
    });
  }

  private buildCreateData(dto: CreateFilterCatalogDto) {
    return {
      filter_code: this.normalizeRequiredText(dto?.filter_code, 'filter_code'),
      filter_type: this.normalizeRequiredText(dto?.filter_type, 'filter_type'),
      usable_steam_cycles: this.normalizeOptionalNonNegativeInt(
        dto?.usable_steam_cycles,
        'usable_steam_cycles',
      ),
      pre_filter_sensory_requirement: this.normalizeOptionalText(
        dto?.pre_filter_sensory_requirement,
        'pre_filter_sensory_requirement',
      ),
      post_filter_sensory_requirement: this.normalizeOptionalText(
        dto?.post_filter_sensory_requirement,
        'post_filter_sensory_requirement',
      ),
      integrity_requirement: this.normalizeOptionalText(
        dto?.integrity_requirement,
        'integrity_requirement',
      ),
      description: this.normalizeOptionalText(dto?.description, 'description'),
    };
  }

  private async buildUpdateData(dto: UpdateFilterCatalogDto, id: number) {
    const data: Prisma.FilterCatalogsUncheckedUpdateInput = {};

    if (dto.filter_code !== undefined) {
      const filterCode = this.normalizeRequiredText(
        dto.filter_code,
        'filter_code',
      );
      await this.ensureFilterCodeAvailable(filterCode, id);
      data.filter_code = filterCode;
    }

    if (dto.filter_type !== undefined) {
      data.filter_type = this.normalizeRequiredText(
        dto.filter_type,
        'filter_type',
      );
    }

    if (dto.usable_steam_cycles !== undefined) {
      data.usable_steam_cycles = this.normalizeOptionalNonNegativeInt(
        dto.usable_steam_cycles,
        'usable_steam_cycles',
      );
    }

    if (dto.pre_filter_sensory_requirement !== undefined) {
      data.pre_filter_sensory_requirement = this.normalizeOptionalText(
        dto.pre_filter_sensory_requirement,
        'pre_filter_sensory_requirement',
      );
    }

    if (dto.post_filter_sensory_requirement !== undefined) {
      data.post_filter_sensory_requirement = this.normalizeOptionalText(
        dto.post_filter_sensory_requirement,
        'post_filter_sensory_requirement',
      );
    }

    if (dto.integrity_requirement !== undefined) {
      data.integrity_requirement = this.normalizeOptionalText(
        dto.integrity_requirement,
        'integrity_requirement',
      );
    }

    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalText(
        dto.description,
        'description',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private async ensureFilterCodeAvailable(code: string, currentId?: number) {
    const existing = await this.prismaService.filterCatalogs.findUnique({
      where: { filter_code: code },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Filter code already exists');
    }
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeOptionalText(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    return value.trim() || null;
  }

  private normalizeOptionalNonNegativeInt(value: unknown, fieldName: string) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value.trim())
          ? Number(value.trim())
          : Number.NaN;

    if (!Number.isSafeInteger(numericValue) || numericValue < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer`,
      );
    }

    return numericValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
