import { auditExtension } from './audit.extension';
import { auditContext } from './audit-context';
import { Prisma } from '@prisma/client';

describe('auditExtension', () => {
  const findUnique = jest.fn();
  const createLog = jest.fn();
  const client = {
    filterCatalogs: { findUnique },
    users: { findUnique },
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
