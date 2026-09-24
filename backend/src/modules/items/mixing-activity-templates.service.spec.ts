import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UpdateMixingActivityTemplateDto } from './dto/update-mixing-activity-template.dto';
import { MixingActivityTemplatesService } from './mixing-activity-templates.service';

describe('MixingActivityTemplatesService detail loading', () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const update = jest.fn();
  const create = jest.fn();
  const findItem = jest.fn();
  const service = new MixingActivityTemplatesService({
    mixingActivityTemplates: { findUnique, findMany, update, create },
    items: { findUnique: findItem },
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('loads the entire ordered tree, including creator details, in the detail query', async () => {
    const detail = {
      id: 1,
      stages: [{ id: 2, steps: [{ id: 3, parameters: [] }] }],
    };
    findUnique.mockResolvedValue(detail);
    expect(await service.findById(1)).toEqual(detail);
    expect(findUnique).toHaveBeenCalledTimes(1);
    const query = findUnique.mock.calls[0][0];
    expect(query.where).toEqual({ id: 1 });
    const stages = query.include.stages;
    expect(stages.orderBy).toEqual([{ stage_order: 'asc' }, { id: 'asc' }]);
    const steps = stages.include.steps;
    expect(steps.orderBy).toEqual([{ step_order: 'asc' }, { id: 'asc' }]);
    const parameters = steps.include.parameters;
    expect(parameters.orderBy).toEqual([
      { parameter_order: 'asc' },
      { id: 'asc' },
    ]);
    for (const node of [stages, steps, parameters]) {
      expect(node.include.createdBy.select.name).toBe(true);
    }
  });

  it('keeps the template list lightweight', async () => {
    findMany.mockResolvedValue([]);
    await service.findAll();
    expect(findMany.mock.calls[0][0].include.stages).toBeUndefined();
  });

  it('does not load the tree for a metadata update', async () => {
    findUnique.mockResolvedValue({ id: 1 });
    update.mockResolvedValue({ id: 1, description: 'Updated' });
    await service.update(1, { description: 'Updated' });
    expect(findUnique.mock.calls[0][0].include.stages).toBeUndefined();
    expect(update.mock.calls[0][0].include.stages).toBeUndefined();
  });

  it('updates a template status to inactive', async () => {
    findUnique.mockResolvedValue({ id: 1 });
    update.mockResolvedValue({ id: 1, status: 'inactive' });

    await expect(service.update(1, { status: 'inactive' })).resolves.toEqual({
      id: 1,
      status: 'inactive',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { status: 'inactive' },
      }),
    );
  });

  it('always creates a new template with active status', async () => {
    findItem.mockResolvedValue({ item_code: 'TP00001' });
    create.mockResolvedValue({ id: 1, status: 'active' });

    await service.create(
      'TP00001',
      {
        batch_size: 100,
        unit_of_measure: 'kg',
        description: 'Biểu mẫu mới',
      },
      { id: 9 },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'active' }),
      }),
    );
  });

  it.each([undefined, null, 'stopped', true])(
    'rejects an invalid template status %p',
    async (status) => {
      findUnique.mockResolvedValue({ id: 1 });
      const invalidDto = {
        status,
      } as unknown as UpdateMixingActivityTemplateDto;
      await expect(service.update(1, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('rejects a missing template', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.findById(99)).rejects.toThrow(NotFoundException);
  });
});

describe('MixingActivityTemplatesService.copyFromTemplate', () => {
  const source = {
    id: 17,
    item_code: 'BTP-SOURCE',
    version: 20,
    batch_size: '125.500',
    unit_of_measure: 'kg',
    description: 'Phiếu pha nguồn',
    created_by_id: 2,
    stages: [
      {
        id: 30,
        stage_name: 'Pha chế',
        stage_order: 2,
        created_by_id: 2,
        steps: [
          {
            id: 40,
            step_name: 'Khuấy',
            step_order: 3,
            created_by_id: 2,
            parameters: [
              {
                id: 50,
                parameter_name: 'Tốc độ',
                data_type: 'number',
                unit: 'rpm',
                requirement: '100–200',
                parameter_order: 1,
                created_by_id: 2,
              },
              {
                id: 51,
                parameter_name: 'Cảm quan',
                data_type: 'text',
                unit: null,
                requirement: 'Đồng nhất',
                parameter_order: 4,
                created_by_id: 2,
              },
            ],
          },
          {
            id: 41,
            step_name: 'Kết thúc',
            step_order: 5,
            created_by_id: 2,
            parameters: [],
          },
        ],
      },
      {
        id: 31,
        stage_name: 'Đóng gói',
        stage_order: 6,
        created_by_id: 2,
        steps: [],
      },
    ],
  };
  let service: MixingActivityTemplatesService;
  let tx: {
    items: { findUnique: jest.Mock };
    mixingActivityTemplates: {
      findUnique: jest.Mock;
      aggregate: jest.Mock;
      create: jest.Mock;
    };
  };
  let transaction: jest.Mock;

  beforeEach(() => {
    tx = {
      items: {
        findUnique: jest.fn().mockResolvedValue({ item_code: 'BTP-TARGET' }),
      },
      mixingActivityTemplates: {
        findUnique: jest.fn().mockResolvedValue(source),
        aggregate: jest.fn().mockResolvedValue({ _max: { version: 4 } }),
        create: jest
          .fn()
          .mockResolvedValue({ id: 99, version: 5, item_code: 'BTP-TARGET' }),
      },
    };
    transaction = jest.fn((callback) => callback(tx));
    // Only the transaction client exposes writes, so copying cannot write outside it.
    service = new MixingActivityTemplatesService({
      $transaction: transaction,
    } as unknown as PrismaService);
  });

  it('copies the complete tree with new ownership and target version in one transaction', async () => {
    const before = JSON.stringify(source);
    const result = await service.copyFromTemplate(
      ' BTP-TARGET ',
      { source_template_id: '17' },
      { id: '9' },
    );
    expect(result).toEqual({ id: 99, version: 5, item_code: 'BTP-TARGET' });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.items.findUnique).toHaveBeenCalledWith({
      where: { item_code: 'BTP-TARGET' },
      select: { item_code: true },
    });
    expect(tx.mixingActivityTemplates.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 17 } }),
    );
    expect(tx.mixingActivityTemplates.aggregate).toHaveBeenCalledWith({
      where: { item_code: 'BTP-TARGET' },
      _max: { version: true },
    });
    expect(tx.mixingActivityTemplates.create).toHaveBeenCalledTimes(1);
    expect(tx.mixingActivityTemplates.create.mock.calls[0][0].data).toEqual({
      item_code: 'BTP-TARGET',
      version: 5,
      batch_size: 125.5,
      unit_of_measure: 'kg',
      description: 'Phiếu pha nguồn',
      status: 'active',
      created_by_id: 9,
      stages: {
        create: [
          {
            stage_name: 'Pha chế',
            stage_order: 2,
            created_by_id: 9,
            steps: {
              create: [
                {
                  step_name: 'Khuấy',
                  step_order: 3,
                  created_by_id: 9,
                  parameters: {
                    create: [
                      {
                        parameter_name: 'Tốc độ',
                        data_type: 'number',
                        unit: 'rpm',
                        requirement: '100–200',
                        parameter_order: 1,
                        created_by_id: 9,
                      },
                      {
                        parameter_name: 'Cảm quan',
                        data_type: 'text',
                        unit: null,
                        requirement: 'Đồng nhất',
                        parameter_order: 4,
                        created_by_id: 9,
                      },
                    ],
                  },
                },
                {
                  step_name: 'Kết thúc',
                  step_order: 5,
                  created_by_id: 9,
                  parameters: { create: [] },
                },
              ],
            },
          },
          {
            stage_name: 'Đóng gói',
            stage_order: 6,
            created_by_id: 9,
            steps: { create: [] },
          },
        ],
      },
    });
    expect(JSON.stringify(source)).toBe(before);
  });

  it('supports cloning within the same item with edited header values', async () => {
    await service.copyFromTemplate(
      'BTP-SOURCE',
      {
        source_template_id: 17,
        version: 23,
        batch_size: '200',
        unit_of_measure: ' L ',
        description: null,
      },
      { id: 9 },
    );
    expect(tx.mixingActivityTemplates.aggregate).not.toHaveBeenCalled();
    expect(
      tx.mixingActivityTemplates.create.mock.calls[0][0].data,
    ).toMatchObject({
      item_code: 'BTP-SOURCE',
      version: 23,
      batch_size: 200,
      unit_of_measure: 'L',
      description: null,
      status: 'active',
    });
  });

  it('scales numeric placeholders only in a same-item copy with the same unit', async () => {
    const sourceWithPlaceholders = {
      ...source,
      description: 'Cỡ lô {{125,5}}',
      stages: [
        {
          ...source.stages[0],
          stage_name: 'Pha {{20}}',
          steps: [
            {
              ...source.stages[0].steps[0],
              step_name: 'Khuấy {{1.25}}',
              parameters: [
                {
                  ...source.stages[0].steps[0].parameters[0],
                  parameter_name: 'Tốc độ {{100}}',
                  unit: '{{rpm}}',
                  requirement: 'Giới hạn 10; {{50}} rpm; {{không phải số}}',
                },
              ],
            },
          ],
        },
      ],
    };
    tx.mixingActivityTemplates.findUnique.mockResolvedValue(
      sourceWithPlaceholders,
    );

    await service.copyFromTemplate(
      'BTP-SOURCE',
      {
        source_template_id: 17,
        version: 21,
        batch_size: '251',
        unit_of_measure: 'kg',
      },
      { id: 9 },
    );

    expect(
      tx.mixingActivityTemplates.create.mock.calls[0][0].data,
    ).toMatchObject({
      batch_size: 251,
      unit_of_measure: 'kg',
      description: 'Cỡ lô {{251}}',
      stages: {
        create: [
          {
            stage_name: 'Pha {{40}}',
            steps: {
              create: [
                {
                  step_name: 'Khuấy {{2.5}}',
                  parameters: {
                    create: [
                      {
                        parameter_name: 'Tốc độ {{200}}',
                        unit: '{{rpm}}',
                        requirement:
                          'Giới hạn 10; {{100}} rpm; {{không phải số}}',
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
    expect(sourceWithPlaceholders.stages[0].stage_name).toBe('Pha {{20}}');
  });

  it('does not scale numeric placeholders when the copied unit changes', async () => {
    tx.mixingActivityTemplates.findUnique.mockResolvedValue({
      ...source,
      description: 'Cỡ lô {{125.5}}',
      stages: [
        {
          ...source.stages[0],
          stage_name: 'Pha {{20}}',
          steps: [],
        },
      ],
    });

    await service.copyFromTemplate(
      'BTP-SOURCE',
      {
        source_template_id: 17,
        version: 21,
        batch_size: '251',
        unit_of_measure: 'Lít',
      },
      { id: 9 },
    );

    expect(
      tx.mixingActivityTemplates.create.mock.calls[0][0].data,
    ).toMatchObject({
      description: 'Cỡ lô {{125.5}}',
      stages: {
        create: [expect.objectContaining({ stage_name: 'Pha {{20}}' })],
      },
    });
  });

  it('copies an empty template to the first version of a target item', async () => {
    tx.mixingActivityTemplates.findUnique.mockResolvedValue({
      ...source,
      stages: [],
    });
    tx.mixingActivityTemplates.aggregate.mockResolvedValue({
      _max: { version: null },
    });
    await service.copyFromTemplate(
      'BTP-TARGET',
      { source_template_id: 17 },
      { id: 9 },
    );
    expect(
      tx.mixingActivityTemplates.create.mock.calls[0][0].data,
    ).toMatchObject({ version: 1, stages: { create: [] } });
  });

  it('rejects a missing source before creating a template', async () => {
    tx.mixingActivityTemplates.findUnique.mockResolvedValue(null);
    await expect(
      service.copyFromTemplate(
        'BTP-TARGET',
        { source_template_id: 99 },
        { id: 9 },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(tx.mixingActivityTemplates.create).not.toHaveBeenCalled();
  });

  it('rejects a missing destination before reading or writing the template', async () => {
    tx.items.findUnique.mockResolvedValue(null);
    await expect(
      service.copyFromTemplate(
        'MISSING',
        { source_template_id: 17 },
        { id: 9 },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(tx.mixingActivityTemplates.findUnique).not.toHaveBeenCalled();
    expect(tx.mixingActivityTemplates.create).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, 'bad', undefined])(
    'rejects invalid source ID %s before the transaction',
    async (id) => {
      await expect(
        service.copyFromTemplate(
          'BTP-TARGET',
          { source_template_id: id as number },
          { id: 9 },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('requires an authenticated creator', async () => {
    await expect(
      service.copyFromTemplate('BTP-TARGET', { source_template_id: 17 }),
    ).rejects.toThrow(UnauthorizedException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([{ version: 0 }, { batch_size: -1 }, { unit_of_measure: '' }])(
    'rejects invalid overrides %s without creating a partial copy',
    async (overrides) => {
      await expect(
        service.copyFromTemplate(
          'BTP-TARGET',
          { source_template_id: 17, ...overrides },
          { id: 9 },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(tx.mixingActivityTemplates.create).not.toHaveBeenCalled();
    },
  );

  it('propagates failure of the atomic nested write to the transaction', async () => {
    const error = new Error('Nested parameter write failed');
    tx.mixingActivityTemplates.create.mockRejectedValue(error);
    await expect(
      service.copyFromTemplate(
        'BTP-TARGET',
        { source_template_id: 17 },
        { id: 9 },
      ),
    ).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.mixingActivityTemplates.create).toHaveBeenCalledTimes(1);
  });
});
