import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionSpecificationsService } from './production-specifications.service';

describe('ProductionSpecificationsService', () => {
  let service: ProductionSpecificationsService;
  const authenticatedUser = { id: 7 };
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
      service.create(
        {
          item_code: 'TP00001',
          product_line_id: '2',
        },
        authenticatedUser,
      ),
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
        lower_control_limit_operator: null,
        upper_control_limit: null,
        upper_control_limit_operator: null,
        lower_allowed_limit: null,
        lower_allowed_limit_operator: null,
        upper_allowed_limit: null,
        upper_allowed_limit_operator: null,
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
        hardness_lower_control_limit: null,
        hardness_upper_control_limit: null,
        hardness_lower_allowed_limit: null,
        hardness_upper_allowed_limit: null,
        hardness_unit: 'N',
        tablet_thickness_control_limit: null,
        tablet_thickness_allowed_limit: null,
        tablet_thickness_unit: 'mm',
        disintegration_time_control_limit: null,
        disintegration_time_allowed_limit: null,
        disintegration_time_unit: 'phút',
        updated_by_id: 7,
      },
      include: {
        item: true,
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

    await service.create(
      {
        item_code: 'TP00002',
        product_line: 'Line B',
      },
      authenticatedUser,
    );

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
          updated_by_id: 7,
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

    await service.update(
      'TP00003',
      {
        spray_dose_lower_allowed_limit: 90,
        spray_dose_upper_allowed_limit: '110',
        spray_dose_lower_control_limit: '95.5',
        spray_dose_upper_control_limit: '105.5',
      },
      authenticatedUser,
    );

    expect(prismaService.productionSpecifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          spray_dose_lower_allowed_limit: expect.any(Object),
          spray_dose_upper_allowed_limit: expect.any(Object),
          spray_dose_lower_control_limit: expect.any(Object),
          spray_dose_upper_control_limit: expect.any(Object),
          updated_by_id: 7,
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

    await service.update(
      'TP00004',
      {
        film_coated_tablet_weight_lower_control_limit: 195,
        film_coated_tablet_weight_upper_control_limit: '205',
        film_coated_tablet_weight_lower_allowed_limit: '190.5',
        film_coated_tablet_weight_upper_allowed_limit: '210.5',
        film_coated_tablet_weight_unit: ' mg ',
      },
      authenticatedUser,
    );

    expect(prismaService.productionSpecifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          film_coated_tablet_weight_lower_control_limit: expect.any(Object),
          film_coated_tablet_weight_upper_control_limit: expect.any(Object),
          film_coated_tablet_weight_lower_allowed_limit: expect.any(Object),
          film_coated_tablet_weight_upper_allowed_limit: expect.any(Object),
          film_coated_tablet_weight_unit: 'mg',
          updated_by_id: 7,
        }),
      }),
    );
  });

  it('updates hardness limits and unit', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00007' });
    prismaService.productionSpecifications.findUnique.mockResolvedValue({
      item_code: 'TP00007',
      deleted_at: null,
    });
    prismaService.productionSpecifications.update.mockResolvedValue({
      item_code: 'TP00007',
      hardness_lower_control_limit: '75',
      hardness_upper_control_limit: '85',
      hardness_lower_allowed_limit: '70',
      hardness_upper_allowed_limit: '90',
      hardness_unit: 'N',
    });

    await service.update(
      'TP00007',
      {
        hardness_lower_control_limit: 75,
        hardness_upper_control_limit: '85',
        hardness_lower_allowed_limit: '70.5',
        hardness_upper_allowed_limit: '90.5',
        hardness_unit: ' N ',
      },
      authenticatedUser,
    );

    expect(prismaService.productionSpecifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hardness_lower_control_limit: expect.any(Object),
          hardness_upper_control_limit: expect.any(Object),
          hardness_lower_allowed_limit: expect.any(Object),
          hardness_upper_allowed_limit: expect.any(Object),
          hardness_unit: 'N',
          updated_by_id: 7,
        }),
      }),
    );
  });

  it('defaults hardness unit to N when updated with empty text', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00008' });
    prismaService.productionSpecifications.findUnique.mockResolvedValue({
      item_code: 'TP00008',
      deleted_at: null,
    });
    prismaService.productionSpecifications.update.mockResolvedValue({
      item_code: 'TP00008',
      hardness_unit: 'N',
    });

    await service.update(
      'TP00008',
      {
        hardness_unit: '  ',
      },
      authenticatedUser,
    );

    expect(prismaService.productionSpecifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hardness_unit: 'N',
          updated_by_id: 7,
        }),
      }),
    );
  });

  it('updates tablet thickness and disintegration time limits with their units', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00009' });
    prismaService.productionSpecifications.findUnique.mockResolvedValue({
      item_code: 'TP00009',
      deleted_at: null,
    });
    prismaService.productionSpecifications.update.mockResolvedValue({
      item_code: 'TP00009',
      tablet_thickness_unit: 'mm',
      disintegration_time_unit: 'phút',
    });

    await service.update(
      'TP00009',
      {
        tablet_thickness_control_limit: 4.2,
        tablet_thickness_allowed_limit: '4.4',
        tablet_thickness_unit: ' mm ',
        disintegration_time_control_limit: 11,
        disintegration_time_allowed_limit: '12.5',
        disintegration_time_unit: ' phút ',
      },
      authenticatedUser,
    );

    expect(prismaService.productionSpecifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tablet_thickness_control_limit: expect.any(Object),
          tablet_thickness_allowed_limit: expect.any(Object),
          tablet_thickness_unit: 'mm',
          disintegration_time_control_limit: expect.any(Object),
          disintegration_time_allowed_limit: expect.any(Object),
          disintegration_time_unit: 'phút',
          updated_by_id: 7,
        }),
      }),
    );
  });

  it('updates specification limit operators', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00005' });
    prismaService.productionSpecifications.findUnique.mockResolvedValue({
      item_code: 'TP00005',
      deleted_at: null,
    });
    prismaService.productionSpecifications.update.mockResolvedValue({
      item_code: 'TP00005',
      lower_control_limit_operator: '>=',
      upper_control_limit_operator: '<=',
      lower_allowed_limit_operator: '>',
      upper_allowed_limit_operator: '<',
    });

    await service.update(
      'TP00005',
      {
        lower_control_limit_operator: ' >= ',
        upper_control_limit_operator: '<=',
        lower_allowed_limit_operator: '>',
        upper_allowed_limit_operator: '<',
      },
      authenticatedUser,
    );

    expect(prismaService.productionSpecifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lower_control_limit_operator: '>=',
          upper_control_limit_operator: '<=',
          lower_allowed_limit_operator: '>',
          upper_allowed_limit_operator: '<',
          updated_by_id: 7,
        }),
      }),
    );
  });

  it('rejects invalid specification limit operators', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00006' });
    prismaService.productionSpecifications.findUnique.mockResolvedValue({
      item_code: 'TP00006',
      deleted_at: null,
    });

    await expect(
      service.update(
        'TP00006',
        {
          lower_control_limit_operator: '!=',
        },
        authenticatedUser,
      ),
    ).rejects.toThrow(
      'lower_control_limit_operator must be one of <, <=, >, >=',
    );
  });
});
