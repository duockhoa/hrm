import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductLineDto } from './dto/create-product-line.dto';
import { UpdateProductLineDto } from './dto/update-product-line.dto';

@Injectable()
export class ProductLinesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.productLines.findMany({
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findById(id: number) {
    const productLine = await this.prismaService.productLines.findUnique({
      where: { id },
      include: {
        productionSpecifications: true,
      },
    });

    if (!productLine) {
      throw new NotFoundException('Product line not found');
    }

    return productLine;
  }

  async findByCode(code: string) {
    const normalizedCode = this.normalizeRequiredString(code, 'code');
    const productLine = await this.prismaService.productLines.findUnique({
      where: { code: normalizedCode },
      include: {
        productionSpecifications: true,
      },
    });

    if (!productLine) {
      throw new NotFoundException('Product line not found');
    }

    return productLine;
  }

  async create(createDto: CreateProductLineDto) {
    const data = this.buildCreateData(createDto);
    await this.ensureCodeIsAvailable(data.code);

    return this.prismaService.productLines.create({
      data,
    });
  }

  async update(id: number, updateDto: UpdateProductLineDto) {
    const productLine = await this.findById(id);
    const data = await this.buildUpdateData(id, updateDto, productLine.name);

    return this.prismaService.productLines.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.productLines.delete({
      where: { id },
    });
  }

  private buildCreateData(
    dto: CreateProductLineDto,
  ): Prisma.ProductLinesUncheckedCreateInput {
    const name = this.normalizeRequiredString(dto.name, 'name');
    const code =
      dto.code === undefined || dto.code === null
        ? this.buildCodeFromName(name)
        : this.normalizeRequiredString(dto.code, 'code');

    return {
      code,
      name,
    };
  }

  private async buildUpdateData(
    id: number,
    dto: UpdateProductLineDto,
    currentName: string,
  ) {
    const data: Prisma.ProductLinesUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredString(dto.name, 'name');
    }

    if (dto.code !== undefined) {
      const code =
        dto.code === null
          ? this.buildCodeFromName(String(data.name ?? currentName))
          : this.normalizeRequiredString(dto.code, 'code');
      await this.ensureCodeIsAvailable(code, id);
      data.code = code;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private async ensureCodeIsAvailable(code: string, currentId?: number) {
    const existing = await this.prismaService.productLines.findUnique({
      where: { code },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Product line code already exists');
    }
  }

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private buildCodeFromName(name: string) {
    return (
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase() || 'PRODUCT_LINE'
    );
  }
}
