import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';

const manufacturerInclude = {
  createdBy: {
    select: { id: true, username: true, name: true },
  },
} satisfies Prisma.ManufacturersInclude;

@Injectable()
export class ManufacturersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.manufacturers.findMany({
      orderBy: { manufacturer_code: 'asc' },
      include: manufacturerInclude,
    });
  }

  async findById(id: number) {
    const manufacturer = await this.prisma.manufacturers.findUnique({
      where: { id },
      include: manufacturerInclude,
    });
    if (!manufacturer) throw new NotFoundException('Manufacturer not found');
    return manufacturer;
  }

  async create(
    dto: CreateManufacturerDto,
    user?: { id?: number | string | null },
  ) {
    const manufacturer_name = this.normalizeText(
      dto?.manufacturer_name,
      'manufacturer_name',
      255,
    );
    const created_by_id = Number(user?.id);
    if (!Number.isSafeInteger(created_by_id) || created_by_id <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // The sequence row stays locked until this transaction commits.
          const sequence = await tx.manufacturerCodeSequence.update({
            where: { id: 1 },
            data: { last_number: { increment: 1 } },
          });
          const manufacturer_code = `NSX${String(sequence.last_number).padStart(4, '0')}`;
          return tx.manufacturers.create({
            data: { manufacturer_code, manufacturer_name, created_by_id },
            include: manufacturerInclude,
          });
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 2
        ) {
          continue;
        }
        this.handlePrismaError(error);
      }
    }
  }

  async update(id: number, dto: UpdateManufacturerDto) {
    await this.findById(id);
    if (dto?.manufacturer_name === undefined) {
      throw new BadRequestException('No update data provided');
    }
    const data: Prisma.ManufacturersUpdateInput = {};
    if (dto.manufacturer_name !== undefined) {
      data.manufacturer_name = this.normalizeText(
        dto.manufacturer_name,
        'manufacturer_name',
        255,
      );
    }
    try {
      return await this.prisma.manufacturers.update({
        where: { id },
        data,
        include: manufacturerInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async delete(id: number) {
    try {
      return await this.prisma.manufacturers.delete({
        where: { id },
        include: manufacturerInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private normalizeText(value: unknown, field: string, maxLength: number) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(
        `${field} is required and must be a string`,
      );
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${field} must not exceed ${maxLength} characters`,
      );
    }
    return normalized;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Manufacturer code already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Manufacturer not found');
      }
    }
    throw error;
  }
}
