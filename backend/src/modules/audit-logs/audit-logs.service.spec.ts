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
    const select = findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('ip_address');
    expect(select).not.toHaveProperty('user_agent');
  });
});
