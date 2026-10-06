import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { SAP_BP_TYPES } from '../sap-b1-connector/sap-business-partner';

@Injectable()
export class BusinessPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(cardType?: string, search?: string) {
    if (cardType && !SAP_BP_TYPES.some((type) => type === cardType)) {
      throw new BadRequestException(
        'cardType must be cSupplier, cCustomer or cLid',
      );
    }
    const where: Prisma.BusinessPartnersWhereInput = {};
    if (cardType) where.card_type = cardType;
    const keyword = search?.trim();
    if (keyword) {
      where.OR = ['card_code', 'card_name', 'tax_code'].map((field) => ({
        [field]: { contains: keyword },
      }));
    }
    return this.prisma.businessPartners.findMany({
      where,
      orderBy: { card_code: 'asc' },
    });
  }

  async findByCode(cardCode: string) {
    const partner = await this.prisma.businessPartners.findUnique({
      where: { card_code: cardCode },
    });
    if (!partner) throw new NotFoundException('Business partner not found');
    return partner;
  }
}
