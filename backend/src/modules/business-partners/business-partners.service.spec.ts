import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { BusinessPartnersService } from './business-partners.service';

describe('BusinessPartnersService', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const service = new BusinessPartnersService({
    businessPartners: { findMany, findUnique },
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('lists local records with optional type and keyword filters', async () => {
    findMany.mockResolvedValue([]);
    await service.findAll('cSupplier', '  Phúc Thái  ');
    expect(findMany).toHaveBeenCalledWith({
      where: {
        card_type: 'cSupplier',
        OR: [
          { card_code: { contains: 'Phúc Thái' } },
          { card_name: { contains: 'Phúc Thái' } },
          { tax_code: { contains: 'Phúc Thái' } },
        ],
      },
      orderBy: { card_code: 'asc' },
    });
    await service.findAll();
    expect(findMany).toHaveBeenLastCalledWith({
      where: {},
      orderBy: { card_code: 'asc' },
    });
  });

  it('rejects invalid partner types before querying the database', () => {
    expect(() => service.findAll('invalid')).toThrow(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('reads by code and returns 404 when missing', async () => {
    findUnique
      .mockResolvedValueOnce({ card_code: 'NC001' })
      .mockResolvedValueOnce(null);
    await expect(service.findByCode('NC001')).resolves.toEqual({
      card_code: 'NC001',
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { card_code: 'NC001' } });
    await expect(service.findByCode('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
