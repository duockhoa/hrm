import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductLinesService } from './product-lines.service';

describe('ProductLinesService', () => {
  let service: ProductLinesService;
  let prismaService: {
    productLines: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductLinesService,
        {
          provide: PrismaService,
          useValue: {
            productLines: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductLinesService>(ProductLinesService);
    prismaService = module.get(PrismaService);
  });

  it('creates a product line and generates code from name when omitted', async () => {
    const productLine = {
      id: 1,
      code: 'LINE_A',
      name: 'Line A',
    };
    prismaService.productLines.findUnique.mockResolvedValue(null);
    prismaService.productLines.create.mockResolvedValue(productLine);

    await expect(service.create({ name: 'Line A' })).resolves.toBe(productLine);
    expect(prismaService.productLines.create).toHaveBeenCalledWith({
      data: {
        code: 'LINE_A',
        name: 'Line A',
      },
    });
  });

  it('regenerates code from the current name when updating code to null', async () => {
    const productLine = {
      id: 1,
      code: 'OLD_CODE',
      name: 'Line A',
      productionSpecifications: [],
    };
    prismaService.productLines.findUnique
      .mockResolvedValueOnce(productLine)
      .mockResolvedValueOnce(null);
    prismaService.productLines.update.mockResolvedValue({
      ...productLine,
      code: 'LINE_A',
    });

    await service.update(1, { code: null });

    expect(prismaService.productLines.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        code: 'LINE_A',
      },
    });
  });
});
