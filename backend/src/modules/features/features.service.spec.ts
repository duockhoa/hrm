import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { FeaturesService } from './features.service';

describe('FeaturesService', () => {
  let service: FeaturesService;
  let prismaService: {
    features: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    itemFeatures: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    items: {
      findFirst: jest.Mock;
    };
    featureSectionActions: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      features: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      itemFeatures: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      items: {
        findFirst: jest.fn(),
      },
      featureSectionActions: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    prismaService.$transaction.mockImplementation(
      (callback: (client: typeof prismaService) => unknown) =>
        callback(prismaService),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<FeaturesService>(FeaturesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gets all features ordered for display', async () => {
    const features = [{ id: 1, key: 'environment_checks', kind: 'section' }];
    prismaService.features.findMany.mockResolvedValue(features);

    await expect(service.findAll()).resolves.toEqual([
      {
        ...features[0],
        supports_required: true,
        source_actions: [],
        target_sections: [],
      },
    ]);
    expect(prismaService.features.findMany).toHaveBeenCalledWith({
      orderBy: [{ default_order: 'asc' }, { key: 'asc' }],
      include: expect.any(Object),
    });
  });

  it('creates a feature with normalized data', async () => {
    const createdFeature = {
      id: 1,
      key: 'environment_checks',
      kind: 'section',
      label: 'Nhiệt độ/độ ẩm',
      default_order: 10,
    };

    prismaService.features.findUnique.mockResolvedValue(null);
    prismaService.features.create.mockResolvedValue(createdFeature);

    await expect(
      service.create({
        key: '  environment_checks  ',
        kind: '  section  ',
        label: '  Nhiệt độ/độ ẩm  ',
        default_order: '10',
      }),
    ).resolves.toEqual({
      ...createdFeature,
      source_actions: [],
      target_sections: [],
    });
    expect(prismaService.features.create).toHaveBeenCalledWith({
      include: expect.any(Object),
      data: {
        key: 'environment_checks',
        kind: 'section',
        label: 'Nhiệt độ/độ ẩm',
        group_name: null,
        default_order: 10,
      },
    });
  });

  it('throws ConflictException when feature key already exists', async () => {
    prismaService.features.findUnique.mockResolvedValue({
      id: 1,
      key: 'environment_checks',
    });

    await expect(
      service.create({
        key: 'environment_checks',
        kind: 'section',
        label: 'Nhiệt độ/độ ẩm',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaService.features.create).not.toHaveBeenCalled();
  });

  it('groups item features into frontend config', async () => {
    prismaService.items.findFirst.mockResolvedValue({
      item_code: 'TP00001',
    });
    prismaService.itemFeatures.findMany.mockResolvedValue([
      {
        feature_id: 1,
        enabled: true,
        required: false,
        order: null,
        feature: {
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          group_name: null,
          default_order: 10,
        },
      },
      {
        feature_id: 2,
        enabled: true,
        required: false,
        order: 20,
        feature: {
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          group_name: null,
          default_order: 10,
        },
      },
    ]);

    await expect(service.findConfigByItemCode('TP00001')).resolves.toEqual({
      item_code: 'TP00001',
      actions: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          group_name: null,
          order: 10,
          enabled: true,
          required: false,
          source_actions: [],
        },
      ],
      sections: [
        {
          feature_id: 2,
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          group_name: null,
          order: 20,
          enabled: true,
          required: false,
          source_actions: [],
        },
      ],
      features: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          group_name: null,
          order: 10,
          enabled: true,
          required: false,
          source_actions: [],
        },
        {
          feature_id: 2,
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          group_name: null,
          order: 20,
          enabled: true,
          required: false,
          source_actions: [],
        },
      ],
    });
    expect(prismaService.itemFeatures.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          item_code: 'TP00001',
          enabled: true,
        },
      }),
    );
  });

  it('upserts an item feature by feature key', async () => {
    const upsertedItemFeature = {
      id: 1,
      item_code: 'TP00001',
      feature_id: 2,
      enabled: false,
      required: false,
      order: 10,
    };

    prismaService.items.findFirst.mockResolvedValue({
      item_code: 'TP00001',
    });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
      key: 'environment_checks',
    });
    prismaService.itemFeatures.upsert.mockResolvedValue(upsertedItemFeature);

    await expect(
      service.upsertItemFeature('TP00001', {
        feature_key: 'environment_checks',
        enabled: 'false',
        order: '10',
      }),
    ).resolves.toBe(upsertedItemFeature);
    expect(prismaService.itemFeatures.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          item_code_feature_id: {
            item_code: 'TP00001',
            feature_id: 2,
          },
        },
        update: {
          enabled: false,
          required: false,
          order: 10,
        },
        create: {
          item_code: 'TP00001',
          feature_id: 2,
          enabled: false,
          required: false,
          order: 10,
        },
      }),
    );
  });

  it('copies every feature from the source in one transaction', async () => {
    prismaService.items.findFirst
      .mockResolvedValueOnce({ item_code: 'TP00001' })
      .mockResolvedValueOnce({ item_code: 'TP00002' });
    prismaService.features.findMany.mockResolvedValue([
      {
        id: 1,
        key: 'create_environment_check',
        kind: 'action',
        label: 'Nhập nhiệt độ/độ ẩm',
        group_name: 'Biểu mẫu chung',
        default_order: 10,
      },
      {
        id: 2,
        key: 'environment_checks',
        kind: 'section',
        label: 'Nhiệt độ/độ ẩm',
        group_name: 'Biểu mẫu chung',
        default_order: 20,
      },
    ]);
    prismaService.itemFeatures.findMany.mockResolvedValue([
      { feature_id: 1, enabled: true, order: null },
      { feature_id: 2, enabled: false, order: 30 },
    ]);
    prismaService.itemFeatures.deleteMany.mockResolvedValue({ count: 1 });
    prismaService.itemFeatures.createMany.mockResolvedValue({ count: 2 });

    await expect(
      service.copyItemFeatureConfig('TP00002', {
        source_item_code: 'TP00001',
      }),
    ).resolves.toEqual({
      item_code: 'TP00002',
      actions: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          group_name: 'Biểu mẫu chung',
          order: 10,
          enabled: true,
          required: false,
          source_actions: [],
        },
      ],
      sections: [
        {
          feature_id: 2,
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          group_name: 'Biểu mẫu chung',
          order: 30,
          enabled: false,
          required: false,
          source_actions: [],
        },
      ],
      features: expect.any(Array),
    });
    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaService.itemFeatures.deleteMany).toHaveBeenCalledWith({
      where: { item_code: 'TP00002' },
    });
    expect(prismaService.itemFeatures.createMany).toHaveBeenCalledWith({
      data: [
        {
          item_code: 'TP00002',
          feature_id: 1,
          enabled: true,
          required: false,
          order: 10,
        },
        {
          item_code: 'TP00002',
          feature_id: 2,
          enabled: false,
          required: false,
          order: 30,
        },
      ],
    });
  });

  it('throws BadRequestException when updating item feature without data', async () => {
    prismaService.items.findFirst.mockResolvedValue({
      item_code: 'TP00001',
    });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
    });
    prismaService.itemFeatures.findUnique.mockResolvedValue({
      item_code: 'TP00001',
      feature_id: 2,
    });

    await expect(
      service.updateItemFeature('TP00001', 2, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.itemFeatures.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the item does not exist', async () => {
    prismaService.items.findFirst.mockResolvedValue(null);

    await expect(service.findByItemCode('TP00001')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaService.itemFeatures.findMany).not.toHaveBeenCalled();
  });

  it('keeps newly linked sections optional unless required is explicitly requested', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
      key: 'environment_checks',
      kind: 'section',
    });
    await service.upsertItemFeature('TP00001', {
      feature_id: 2,
      enabled: true,
    });
    expect(prismaService.itemFeatures.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ enabled: true, required: false }),
        update: { enabled: true },
      }),
    );
  });

  it.each([
    ['action', 'create_environment_check'],
    ['section', 'unregistered_section'],
  ])('rejects required on unsupported %s %s', async (kind, key) => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({ id: 2, key, kind });
    await expect(
      service.upsertItemFeature('TP00001', {
        feature_id: 2,
        enabled: true,
        required: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.itemFeatures.upsert).not.toHaveBeenCalled();
  });

  it('requires a disabled section to be enabled before setting required', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
      key: 'environment_checks',
      kind: 'section',
    });
    prismaService.itemFeatures.findUnique.mockResolvedValue({
      enabled: false,
      required: false,
    });
    await expect(
      service.upsertItemFeature('TP00001', {
        feature_id: 2,
        required: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears required when the section is disabled', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({ id: 2 });
    prismaService.itemFeatures.findUnique.mockResolvedValue({
      enabled: true,
      required: true,
    });
    await service.updateItemFeature('TP00001', 2, { enabled: false });
    expect(prismaService.itemFeatures.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { enabled: false, required: false },
      }),
    );
  });

  it('writes enabled together with a required-only update', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
      key: 'environment_checks',
      kind: 'section',
    });
    prismaService.itemFeatures.findUnique.mockResolvedValue({
      enabled: true,
      required: false,
    });
    await service.updateItemFeature('TP00001', 2, { required: true });
    expect(prismaService.itemFeatures.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { enabled: true, required: true },
      }),
    );
  });

  it('copies required sections and defaults unlinked features to optional', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findMany.mockResolvedValue([
      {
        id: 1,
        key: 'environment_checks',
        kind: 'section',
        label: 'Nhiệt độ/độ ẩm',
        group_name: null,
        default_order: 10,
      },
      {
        id: 2,
        key: 'date_checks',
        kind: 'section',
        label: 'Kiểm tra date',
        group_name: null,
        default_order: 20,
      },
    ]);
    prismaService.itemFeatures.findMany.mockResolvedValue([
      { feature_id: 1, enabled: true, required: true },
    ]);
    const config = await service.copyItemFeatureConfig('TP00002', {
      source_item_code: 'TP00001',
    });
    expect(
      config.sections.map(({ enabled, required }) => ({ enabled, required })),
    ).toEqual([
      { enabled: true, required: true },
      { enabled: false, required: false },
    ]);
    expect(prismaService.itemFeatures.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ feature_id: 1, required: true }),
        ]),
      }),
    );
  });
  describe('section source actions', () => {
    const section = {
      id: 10,
      key: 'checks',
      kind: 'section',
      label: 'Checks',
      itemFeatures: [],
      sourceActions: [],
      targetSections: [],
    };
    const actions = [
      { id: 2, key: 'create_check', kind: 'action', label: 'Create check' },
      { id: 3, key: 'import_check', kind: 'action', label: 'Import check' },
    ];

    it('creates ordered links atomically and returns source action references', async () => {
      prismaService.features.findUnique.mockResolvedValue(null);
      prismaService.features.findMany.mockResolvedValue(actions);
      prismaService.features.create.mockResolvedValue({
        ...section,
        sourceActions: [
          { action: actions[1], order: 0 },
          { action: actions[0], order: 1 },
        ],
      });
      const result = await service.create({
        key: 'checks',
        label: 'Checks',
        kind: 'section',
        action_ids: [3, 2],
      });
      expect(result.source_actions.map((action) => action.id)).toEqual([3, 2]);
      expect(prismaService.features.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceActions: {
              create: [
                { action_id: 3, order: 0 },
                { action_id: 2, order: 1 },
              ],
            },
          }),
        }),
      );
    });

    it.each([null, '2', [0], [-1], [1.5], ['2'], [2, 2]])(
      'rejects invalid action_ids %p',
      async (action_ids) => {
        prismaService.features.findUnique.mockResolvedValue(null);
        await expect(
          service.create({
            key: 'checks',
            kind: 'section',
            label: 'Checks',
            action_ids: action_ids as number[],
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prismaService.features.create).not.toHaveBeenCalled();
      },
    );

    it('rejects missing or non-action targets', async () => {
      prismaService.features.findUnique.mockResolvedValue(null);
      prismaService.features.findMany.mockResolvedValue([]);
      await expect(
        service.create({
          key: 'checks',
          kind: 'section',
          label: 'Checks',
          action_ids: [2],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects source actions on an action feature', async () => {
      prismaService.features.findUnique.mockResolvedValue(null);
      await expect(
        service.create({
          key: 'create_check',
          kind: 'action',
          label: 'Create',
          action_ids: [2],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('replaces links with an empty list without requiring other changes', async () => {
      prismaService.features.findUnique.mockResolvedValue(section);
      prismaService.features.update.mockResolvedValue(section);
      await service.update(10, { action_ids: [] });
      expect(prismaService.features.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            sourceActions: { deleteMany: {}, create: [] },
          },
        }),
      );
    });

    it('preserves links when action_ids is omitted', async () => {
      prismaService.features.findUnique.mockResolvedValue(section);
      prismaService.features.update.mockResolvedValue(section);
      await service.update(10, { label: 'Updated' });
      expect(prismaService.features.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { label: 'Updated' } }),
      );
    });

    it('rejects assigning an owned action when creating another section', async () => {
      prismaService.features.findUnique.mockResolvedValue(null);
      prismaService.features.findMany.mockResolvedValue(actions);
      prismaService.featureSectionActions.findFirst.mockResolvedValue({
        action: { key: 'create_check' },
        section: { label: 'Original section' },
      });
      await expect(
        service.create({
          key: 'new_section',
          kind: 'section',
          label: 'New',
          action_ids: [2, 3],
        }),
      ).rejects.toThrow(ConflictException);
      expect(prismaService.features.create).not.toHaveBeenCalled();
    });

    it('rejects assigning an owned action when editing another section', async () => {
      prismaService.features.findUnique.mockResolvedValue(section);
      prismaService.features.findMany.mockResolvedValue([actions[0]]);
      prismaService.featureSectionActions.findFirst.mockResolvedValue({
        action: { key: 'create_check' },
        section: { label: 'Original section' },
      });
      await expect(service.update(10, { action_ids: [2] })).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.features.update).not.toHaveBeenCalled();
    });

    it('allows keeping and reordering multiple actions owned by the section being edited', async () => {
      prismaService.features.findUnique.mockResolvedValue(section);
      prismaService.features.findMany.mockResolvedValue(actions);
      prismaService.features.update.mockResolvedValue(section);
      await service.update(10, { action_ids: [3, 2] });
      expect(
        prismaService.featureSectionActions.findFirst,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action_id: { in: [3, 2] }, section_id: { not: 10 } },
        }),
      );
      expect(prismaService.features.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            sourceActions: {
              deleteMany: {},
              create: [
                { action_id: 3, order: 0 },
                { action_id: 2, order: 1 },
              ],
            },
          },
        }),
      );
    });

    it.each(['P2002', 'P2034'])(
      'returns a conflict for concurrent link writes (%s)',
      async (code) => {
        prismaService.features.findUnique.mockResolvedValue(null);
        prismaService.features.findMany.mockResolvedValue([actions[0]]);
        prismaService.features.create.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Concurrent write', {
            code,
            clientVersion: '6',
            meta: { target: 'feature_section_actions_action_id_key' },
          }),
        );
        await expect(
          service.create({
            key: 'new_section',
            kind: 'section',
            label: 'New',
            action_ids: [2],
          }),
        ).rejects.toThrow(ConflictException);
      },
    );

    it('blocks changing the kind of an action referenced by a section', async () => {
      prismaService.features.findUnique.mockResolvedValue({
        ...actions[0],
        itemFeatures: [],
        sourceActions: [],
        targetSections: [{ section }],
      });
      await expect(
        service.update(2, { kind: 'section' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaService.features.update).not.toHaveBeenCalled();
    });

    it('blocks changing a linked section kind unless links are removed', async () => {
      prismaService.features.findUnique.mockResolvedValue({
        ...section,
        sourceActions: [{ action: actions[0], order: 0 }],
      });
      await expect(
        service.update(10, { kind: 'action' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
