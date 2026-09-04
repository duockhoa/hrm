import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UpdateItemDto } from './dto/update-item.dto';

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
  async findAll(codePrefix?: string) {
    const normalizedCodePrefix = this.normalizeCodePrefix(codePrefix);
    const items = await this.prismaService.items.findMany({
      ...(normalizedCodePrefix
        ? {
            where: {
              item_code: { startsWith: normalizedCodePrefix },
            },
          }
        : {}),
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

  private normalizeCodePrefix(value?: string) {
    if (value === undefined || value.trim() === '') {
      return undefined;
    }

    const normalizedValue = value.trim().toUpperCase();

    if (!/^[A-Z]+$/.test(normalizedValue)) {
      throw new BadRequestException('codePrefix must contain letters only');
    }

    return normalizedValue;
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
