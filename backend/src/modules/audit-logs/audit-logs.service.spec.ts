import { PrismaService } from 'src/prisma.service';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  it('paginates logs, serializes bigint IDs, and excludes request metadata', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 42n,
        entity_type: 'users',
        entity_id: 7n,
        entity_name: 'Editor',
        action: 'UPDATE',
        old_values: { name: 'Old' },
        new_values: { name: 'New' },
        actor_id: 3n,
        actor_name: 'Admin',
        reason: null,
        request_id: null,
        created_at: new Date('2026-09-24T00:00:00Z'),
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const prisma = {
      auditLogs: { findMany, count },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const service = new AuditLogsService(prisma);

    const result = await service.findAll({ page: 1, limit: 20 });

    expect(result.data[0]).toMatchObject({
      id: '42',
      entity_id: '7',
      actor_id: '3',
    });
    const [{ select }] = findMany.mock.calls[0] as [
      { select: Record<string, boolean> },
    ];
    expect(select).not.toHaveProperty('ip_address');
    expect(select).not.toHaveProperty('user_agent');
  });

  it('applies the entity type and exact bigint ID to both rows and count', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      auditLogs: { findMany, count },
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    } as unknown as PrismaService;
    const service = new AuditLogsService(prisma);

    await service.findAll({
      entity_type: 'production_order_finished_product_summaries',
      entity_id: '7',
      page: 2,
      limit: 20,
    });
    const where = {
      entity_type: 'production_order_finished_product_summaries',
      entity_id: 7n,
    };
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 20, take: 20 }),
    );
    expect(count).toHaveBeenCalledWith({ where });
  });

  it.each(['0', '-1', '1.2', 'abc', '9223372036854775808'])(
    'rejects an invalid entity ID: %s',
    async (entity_id) => {
      const findMany = jest.fn();
      const service = new AuditLogsService({
        auditLogs: { findMany },
      } as unknown as PrismaService);
      await expect(service.findAll({ entity_id })).rejects.toThrow(
        'Invalid entity_id',
      );
      expect(findMany).not.toHaveBeenCalled();
    },
  );
});
