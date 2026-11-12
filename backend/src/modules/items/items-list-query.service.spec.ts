import { PrismaService } from 'src/prisma.service';
import { ItemsService } from './items.service';

describe('Items list query composition', () => {
  let findMany: jest.Mock;
  let count: jest.Mock;
  let service: ItemsService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);
    count = jest.fn().mockResolvedValue(123);
    service = new ItemsService({
      items: { findMany, count },
    } as unknown as PrismaService);
  });

  it('combines filters with AND and counts before skip/top', async () => {
    const onCount = jest.fn();
    await service.findAll(
      {
        skip: '50',
        top: '25',
        search: 'Midkid',
        codePrefix: 'TP',
        series: '108,109',
        registrationId: '12',
        hasRegistration: 'true',
        count: 'true',
      },
      onCount,
    );
    const expectedWhere = {
      AND: [
        { item_code: { startsWith: 'TP' } },
        {
          OR: [
            { item_code: { contains: 'Midkid' } },
            { item_name: { contains: 'Midkid' } },
            { dk_code: { contains: 'Midkid' } },
          ],
        },
        { series: { in: [108, 109] } },
        { registration_id: 12 },
        { registration_id: { not: null } },
      ],
    };
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere, skip: 50, take: 25 }),
    );
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(onCount).toHaveBeenCalledWith(123);
  });

  it('only returns selected scalars unless expand is requested', async () => {
    await service.findAll({ select: 'item_code,item_name,series' });
    expect(findMany).toHaveBeenCalledWith({
      select: { item_code: true, item_name: true, series: true },
      orderBy: [{ item_code: 'asc' }],
    });
    expect(count).not.toHaveBeenCalled();
    await service.findAll({ select: 'item_name', expand: 'registration' });
    expect(findMany).toHaveBeenLastCalledWith({
      select: { item_name: true, registration: true },
      orderBy: [{ item_code: 'asc' }],
    });
  });

  it('supports explicit relation expansion or no relations', async () => {
    await service.findAll({ expand: 'none' });
    expect(findMany).toHaveBeenCalledWith({
      include: {},
      orderBy: [{ item_code: 'asc' }],
    });
    await service.findAll({ expand: 'registration' });
    expect(findMany).toHaveBeenLastCalledWith({
      include: { registration: true },
      orderBy: [{ item_code: 'asc' }],
    });
  });

  it('hides deleted specifications even when selecting scalars with an expansion', async () => {
    findMany.mockResolvedValue([
      {
        item_name: 'Item',
        productionSpecification: { deleted_at: new Date() },
      },
    ]);
    await expect(
      service.findAll({
        select: 'item_name',
        expand: 'productionSpecification',
      }),
    ).resolves.toEqual([{ item_name: 'Item', productionSpecification: null }]);
  });

  it.each([
    ['findFinishedProducts', { item_code: { startsWith: 'TP' } }],
    ['findSemiFinishedProducts', { item_code: { startsWith: 'BTP' } }],
    [
      'findRawMaterials',
      {
        NOT: [
          { item_code: { startsWith: 'TP' } },
          { item_code: { startsWith: 'BTP' } },
        ],
      },
    ],
  ] as const)(
    'retains the %s scope when filters are combined',
    async (method, scope) => {
      await service[method]({
        series: '108',
        hasRegistration: 'false',
        count: 'true',
      });
      const where = {
        AND: [scope, { series: { in: [108] } }, { registration_id: null }],
      };
      expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
      expect(count).toHaveBeenCalledWith({ where });
    },
  );

  it('returns the empty page and the filtered total when skip exceeds the total', async () => {
    const onCount = jest.fn();
    await expect(
      service.findAll({ skip: '500', count: 'true' }, onCount),
    ).resolves.toEqual([]);
    expect(onCount).toHaveBeenCalledWith(123);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 500, take: 50 }),
    );
  });

  it('rejects invalid queries before accessing the database', async () => {
    await expect(service.findAll({ select: 'password' })).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
