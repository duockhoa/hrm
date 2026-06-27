import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionWorkshopDto } from './dto/create-production-workshop.dto';
import { UpdateProductionWorkshopDto } from './dto/update-production-workshop.dto';

@Injectable()
export class ProductionWorkshopsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.productionWorkshops.findMany({
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findById(id: number) {
    const productionWorkshop =
      await this.prismaService.productionWorkshops.findUnique({
        where: { id },
      });

    if (!productionWorkshop) {
      throw new NotFoundException('Production workshop not found');
    }

    return productionWorkshop;
  }

  async create(createDto: CreateProductionWorkshopDto) {
    const data = this.buildCreateData(createDto);
    await this.ensureCodeIsAvailable(data.code);

    return this.prismaService.productionWorkshops.create({
      data,
    });
  }

  async update(id: number, updateDto: UpdateProductionWorkshopDto) {
    await this.findById(id);
    const data = await this.buildUpdateData(id, updateDto);

    return this.prismaService.productionWorkshops.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.productionWorkshops.delete({
      where: { id },
    });
  }

  private buildCreateData(
    dto: CreateProductionWorkshopDto,
  ): Prisma.ProductionWorkshopsUncheckedCreateInput {
    return {
      code: this.normalizeRequiredString(dto.code, 'code'),
      name: this.normalizeRequiredString(dto.name, 'name'),
      description: this.normalizeOptionalString(dto.description),
      address: this.normalizeOptionalString(dto.address),
    };
  }

  private async buildUpdateData(id: number, dto: UpdateProductionWorkshopDto) {
    const data: Prisma.ProductionWorkshopsUncheckedUpdateInput = {};

    if (dto.code !== undefined) {
      const code = this.normalizeRequiredString(dto.code, 'code');
      await this.ensureCodeIsAvailable(code, id);
      data.code = code;
    }

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredString(dto.name, 'name');
    }

    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalString(dto.description);
    }

    if (dto.address !== undefined) {
      data.address = this.normalizeOptionalString(dto.address);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private async ensureCodeIsAvailable(code: string, currentId?: number) {
    const productionWorkshopsDelegate = this.prismaService
      .productionWorkshops as any;
    const existing = await productionWorkshopsDelegate.findUnique({
      where: { code },
      withDeleted: true,
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Production workshop code already exists');
    }
  }

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeOptionalString(value: unknown) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Invalid string value');
    }

    const normalizedValue = value.trim();
    return normalizedValue === '' ? null : normalizedValue;
  }
}
