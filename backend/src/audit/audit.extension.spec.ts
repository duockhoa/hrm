import { auditExtension } from './audit.extension';
import { auditContext } from './audit-context';
import { Prisma } from '@prisma/client';

describe('auditExtension', () => {
  const findUnique = jest.fn();
  const createLog = jest.fn();
  const client = {
    filterCatalogs: { findUnique },
    users: { findUnique },
    productionOrderFinishedProductSummaries: { findUnique },
    items: { findUnique },
    productionSpecifications: { findUnique },
    auditLogs: { create: createLog },
    $extends: jest.fn((extension) => extension),
  };

  let auditOperation: (input: any) => Promise<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    createLog.mockResolvedValue({ id: 1n });
    const extension = (auditExtension as any)(client);
    auditOperation = extension.query.$allModels.$allOperations;
  });

  it('records only changed fields and request actor on update', async () => {
    findUnique.mockResolvedValueOnce({
      id: 7,
      filter_type: 'Old filter',
      filter_code: 'F1',
      updated_at: new Date('2026-09-01'),
    });

    await auditContext.run(
      {
        requestId: 'd2b56d25-7a03-48b1-93d8-93c0ae028af3',
        request: {
          user: { id: 3, name: 'Editor' },
          ip: '127.0.0.1',
          headers: { 'user-agent': 'test' },
        },
      },
      () =>
        auditOperation({
          model: 'FilterCatalogs',
          operation: 'update',
          args: { where: { id: 7 }, data: { filter_type: 'New filter' } },
          query: async () => ({
            id: 7,
            filter_type: 'New filter',
            filter_code: 'F1',
            updated_at: new Date('2026-09-02'),
          }),
        }),
    );

    expect(createLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entity_type: 'filter_catalogs',
        entity_id: 7n,
        action: 'UPDATE',
        old_values: { filter_type: 'Old filter' },
        new_values: { filter_type: 'New filter' },
        actor_id: 3n,
        actor_name: 'Editor',
        request_id: 'd2b56d25-7a03-48b1-93d8-93c0ae028af3',
      }),
    });
  });

  it('does not record updates that only change updated_at', async () => {
    findUnique.mockResolvedValueOnce({
      id: 7,
      filter_type: 'Same',
      updated_at: new Date('2026-09-01'),
    });

    await auditOperation({
      model: 'FilterCatalogs',
      operation: 'update',
      args: { where: { id: 7 }, data: {} },
      query: async () => ({
        id: 7,
        filter_type: 'Same',
        updated_at: new Date('2026-09-02'),
      }),
    });

    expect(createLog).not.toHaveBeenCalled();
  });

  it('records summary before/after counts, actor, and the trimmed reason', async () => {
    findUnique.mockResolvedValueOnce({
      id: 7,
      package_count: 166,
      boxes_per_package: 30,
      loose_box_count: 3,
      note: null,
    });
    await auditContext.run(
      {
        requestId: 'summary-edit',
        request: {
          user: { id: 3, name: 'Nguyễn Thị Gấm' },
          body: { reason: '  Điều chỉnh theo kiểm đếm  ' },
        },
      },
      () =>
        auditOperation({
          model: 'ProductionOrderFinishedProductSummaries',
          operation: 'update',
          args: { where: { id: 7 }, data: { package_count: 167 } },
          query: async () => ({
            id: 7,
            package_count: 167,
            boxes_per_package: 30,
            loose_box_count: 3,
            note: null,
          }),
        }),
    );

    expect(createLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entity_type: 'production_order_finished_product_summaries',
        entity_id: 7n,
        action: 'UPDATE',
        old_values: { package_count: 166 },
        new_values: { package_count: 167 },
        actor_id: 3n,
        actor_name: 'Nguyễn Thị Gấm',
        reason: 'Điều chỉnh theo kiểm đếm',
      }),
    });
  });

  it('redacts credentials from creation logs', async () => {
    await auditOperation({
      model: 'Users',
      operation: 'create',
      args: { data: { username: 'editor', password: 'secret' } },
      query: async () => ({ id: 9, username: 'editor', password: 'secret' }),
    });

    expect(createLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'CREATE',
        old_values: Prisma.DbNull,
        new_values: { id: 9, username: 'editor' },
      }),
    });
  });

  it.each(['Items', 'ProductionSpecifications'])(
    'records string identity and before/after values for %s',
    async (model) => {
      const values =
        model === 'Items'
          ? [
              {
                registration_id: 1,
                registration: { registration_number: 'OLD' },
              },
              {
                registration_id: 2,
                registration: { registration_number: 'NEW' },
              },
            ]
          : [
              { lower_control_limit: '1.250000', updated_by_id: 1 },
              { lower_control_limit: '2.500000', updated_by_id: 2 },
            ];
      findUnique.mockResolvedValueOnce({ item_code: 'TP0001', ...values[0] });
      await auditOperation({
        model,
        operation: 'update',
        args: { where: { item_code: 'TP0001' } },
        query: async () => ({ item_code: 'TP0001', ...values[1] }),
      });
      expect(createLog).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entity_key: 'TP0001',
          entity_id: 0n,
          action: 'UPDATE',
          old_values:
            model === 'Items'
              ? { registration_id: 1, registration_number: 'OLD' }
              : { lower_control_limit: '1.250000' },
          new_values:
            model === 'Items'
              ? { registration_id: 2, registration_number: 'NEW' }
              : { lower_control_limit: '2.500000' },
        }),
      });
    },
  );

  it('does not log an unchanged item or specification when only metadata changes', async () => {
    for (const model of ['Items', 'ProductionSpecifications']) {
      findUnique.mockResolvedValueOnce({
        item_code: 'BTP0001',
        updated_by_id: 1,
        update_at: new Date(0),
      });
      await auditOperation({
        model,
        operation: 'update',
        args: { where: { item_code: 'BTP0001' } },
        query: async () => ({
          item_code: 'BTP0001',
          updated_by_id: 2,
          update_at: new Date(1),
        }),
      });
    }
    expect(createLog).not.toHaveBeenCalled();
  });

  it('records the removed row and no new value on delete', async () => {
    findUnique.mockResolvedValueOnce({ id: 7, filter_code: 'F1' });

    await auditOperation({
      model: 'FilterCatalogs',
      operation: 'delete',
      args: { where: { id: 7 } },
      query: async () => ({ id: 7, filter_code: 'F1' }),
    });

    expect(createLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'DELETE',
        old_values: { id: 7, filter_code: 'F1' },
        new_values: Prisma.DbNull,
      }),
    });
  });
});
