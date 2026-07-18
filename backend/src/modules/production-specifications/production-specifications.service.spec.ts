import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionSpecificationsService } from './production-specifications.service';

describe('ProductionSpecificationsService', () => {
  let service: ProductionSpecificationsService;
  let prismaService: {
    productionSpecifications: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    items: {
      findFirst: jest.Mock;
    };
    productLines: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionSpecificationsService,
        {
          provide: PrismaService,
          useValue: {
            productionSpecifications: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            items: {
              findFirst: jest.fn(),
            },
            productLines: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductionSpecificationsService>(
      ProductionSpecificationsService,
    );
    prismaService = module.get(PrismaService);
  });

  it('creates a specification with product_line_id', async () => {
    const createdSpecification = {
      item_code: 'TP00001',
      product_line_id: 2,
      productLine: {
        id: 2,
        code: 'LINE_A',
        name: 'Line A',
      },
    };
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.productLines.findUnique.mockResolvedValue({
      id: 2,
      code: 'LINE_A',
      name: 'Line A',
    });
    prismaService.productionSpecifications.findUnique.mockResolvedValue(null);
    prismaService.productionSpecifications.create.mockResolvedValue(
      createdSpecification,
    );

    await expect(
      service.create({
        item_code: 'TP00001',
        product_line_id: '2',
      }),
    ).resolves.toBe(createdSpecification);

    expect(prismaService.productLines.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
    });
    expect(prismaService.productionSpecifications.create).toHaveBeenCalledWith({
      data: {
        item_code: 'TP00001',
        product_line_id: 2,
        dosage_form: null,
        lower_control_limit: null,
        upper_control_limit: null,
        lower_allowed_limit: null,
        upper_allowed_limit: null,
        unit: null,
        spray_dose_lower_allowed_limit: null,
        spray_dose_upper_allowed_limit: null,
        spray_dose_lower_control_limit: null,
        spray_dose_upper_control_limit: null,
        film_coated_tablet_weight_lower_control_limit: null,
        film_coated_tablet_weight_upper_control_limit: null,
        film_coated_tablet_weight_lower_allowed_limit: null,
        film_coated_tablet_weight_upper_allowed_limit: null,
        film_coated_tablet_weight_unit: null,
      },
      include: {
        item: true,
        productLine: true,
      },
    });
  });

  it('maps legacy product_line text to a product line row', async () => {
    const createdProductLine = {
      id: 3,
      code: 'LINE_B',
      name: 'Line B',
    };
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00002' });
    prismaService.productLines.findFirst.mockResolvedValue(null);
    prismaService.productLines.findUnique.mockResolvedValue(null);
    prismaService.productLines.create.mockResolvedValue(createdProductLine);
    prismaService.productionSpecifications.findUnique.mockResolvedValue(null);
    prismaService.productionSpecifications.create.mockResolvedValue({
      item_code: 'TP00002',
      product_line_id: 3,
    });

    await service.create({
      item_code: 'TP00002',
      product_line: 'Line B',
    });

    expect(prismaService.productLines.create).toHaveBeenCalledWith({
      data: {
        code: 'LINE_B',
        name: 'Line B',
      },
    });
    expect(prismaService.productionSpecifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          product_line_id: 3,
        }),
      }),
    );
  });

  it('updates spray dose limits', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00003' });
    prismaService.productionSpecifications.findUnique.mockResolvedValue({
      item_code: 'TP00003',
      deleted_at: null,
    });
    prismaService.productionSpecifications.update.mockResolvedValue({
      item_code: 'TP00003',
      spray_dose_lower_allowed_limit: '90',
      spray_dose_upper_allowed_limit: '110',
      spray_dose_lower_control_limit: '95.5',
      spray_dose_upper_control_limit: '105.5',
    });

    await service.update('TP00003', {
      spray_dose_lower_allowed_limit: 90,
      spray_dose_upper_allowed_limit: '110',
      spray_dose_lower_control_limit: '95.5',
      spray_dose_upper_control_limit: '105.5',
    });

    expect(prismaService.productionSpecifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          spray_dose_lower_allowed_limit: expect.any(Object),
          spray_dose_upper_allowed_limit: expect.any(Object),
          spray_dose_lower_control_limit: expect.any(Object),
          spray_dose_upper_control_limit: expect.any(Object),
        }),
      }),
    );
  });

  it('updates film-coated tablet weight limits', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00004' });
    prismaService.productionSpecifications.findUnique.mockResolvedValue({
      item_code: 'TP00004',
      deleted_at: null,
    });
    prismaService.productionSpecifications.update.mockResolvedValue({
      item_code: 'TP00004',
      film_coated_tablet_weight_lower_control_limit: '195',
      film_coated_tablet_weight_upper_control_limit: '205',
      film_coated_tablet_weight_lower_allowed_limit: '190',
      film_coated_tablet_weight_upper_allowed_limit: '210',
      film_coated_tablet_weight_unit: 'mg',
    });

    await service.update('TP00004', {
      film_coated_tablet_weight_lower_control_limit: 195,
      film_coated_tablet_weight_upper_control_limit: '205',
      film_coated_tablet_weight_lower_allowed_limit: '190.5',
      film_coated_tablet_weight_upper_allowed_limit: '210.5',
      film_coated_tablet_weight_unit: ' mg ',
    });

    expect(prismaService.productionSpecifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          film_coated_tablet_weight_lower_control_limit: expect.any(Object),
          film_coated_tablet_weight_upper_control_limit: expect.any(Object),
          film_coated_tablet_weight_lower_allowed_limit: expect.any(Object),
          film_coated_tablet_weight_upper_allowed_limit: expect.any(Object),
          film_coated_tablet_weight_unit: 'mg',
        }),
      }),
    );
  });
});
