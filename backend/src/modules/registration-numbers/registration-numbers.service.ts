import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

type FindAllRegistrationNumbersOptions = {
  search?: string;
};

@Injectable()
export class RegistrationNumbersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(options: FindAllRegistrationNumbersOptions = {}) {
    const search = this.normalizeSearch(options.search);
    const where: Prisma.RegistrationNumbersWhereInput = {
      deleted_at: null,
      ...(search
        ? {
            registration_number: {
              contains: search,
            },
          }
        : {}),
    };

    return this.prismaService.registrationNumbers.findMany({
      where,
      select: {
        id: true,
        registration_number: true,
        product_name: true,
      },
      orderBy: [{ id: 'asc' }],
    });
  }

  private normalizeSearch(value: unknown) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('search must be a string');
    }

    const normalizedValue = value.trim();

    return normalizedValue || undefined;
  }
}
