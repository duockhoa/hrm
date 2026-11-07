import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PRODUCTION_ORDER_HISTORY_RESOURCES } from './production-order-history.resources';
import { ProductionOrderHistoryService } from './production-order-history.service';

describe('ProductionOrderHistoryService', () => {
  const delegates: Record<
    string,
    { findUnique: jest.Mock; findMany: jest.Mock }
  > = {};
  const audit = {
    findForEntities: jest.fn(),
    findHistoricalEntityIds: jest.fn(),
  };
  let service: ProductionOrderHistoryService;
  beforeEach(() => {
    for (const model of Prisma.dmmf.datamodel.models) {
      delegates[model.name[0].toLowerCase() + model.name.slice(1)] = {
        findUnique: jest.fn().mockResolvedValue({ id: 7 }),
        findMany: jest.fn().mockResolvedValue([]),
      };
    }
    audit.findForEntities
      .mockReset()
      .mockResolvedValue({ data: [], meta: { total: 0 } });
    audit.findHistoricalEntityIds.mockReset().mockResolvedValue([]);
    service = new ProductionOrderHistoryService(
      delegates as unknown as PrismaService,
      audit as unknown as AuditLogsService,
    );
  });

  it.each(Object.entries(PRODUCTION_ORDER_HISTORY_RESOURCES))(
    'reads %s with its exact detail permission',
    async (resource, config) => {
      const delegate =
        delegates[config.model[0].toLowerCase() + config.model.slice(1)];
      const model = Prisma.dmmf.datamodel.models.find(
        (model) => model.name === config.model,
      )!;
      await service.findHistory(
        resource,
        7,
        { page: 2, limit: 20 },
        { permissions: [config.permission] },
      );
      expect(delegate.findUnique).toHaveBeenCalledWith({
        where: { id: 7 },
        select: { id: true },
      });
      expect(audit.findForEntities).toHaveBeenCalledWith(
        expect.arrayContaining([{ entityType: model.dbName, ids: [7] }]),
        { page: 2, limit: 20 },
      );
    },
  );

  it.each(Object.entries(PRODUCTION_ORDER_HISTORY_RESOURCES))(
    'rejects an unrelated permission for %s before querying records',
    async (resource) => {
      await expect(
        service.findHistory(
          resource,
          7,
          {},
          { permissions: ['production-orders.update'] },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(audit.findForEntities).not.toHaveBeenCalled();
      expect(
        Object.values(delegates).every(
          (delegate) => delegate.findUnique.mock.calls.length === 0,
        ),
      ).toBe(true);
    },
  );

  it.each(['users', 'audit-logs', '__proto__', 'constructor'])(
    'rejects unregistered resources: %s',
    async (resource) => {
      await expect(
        service.findHistory(
          resource,
          7,
          {},
          { permissions: ['production-orders.read'] },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(audit.findForEntities).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, 1.5, 2147483648, Number.NaN])(
    'rejects invalid record IDs: %s',
    async (id) => {
      await expect(
        service.findHistory(
          'density-check',
          id,
          {},
          { permissions: ['production-orders.read'] },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('does not query logs if the scoped record is missing', async () => {
    delegates.productionOrderDensityChecks.findUnique.mockResolvedValue(null);
    await expect(
      service.findHistory(
        'density-check',
        7,
        {},
        { permissions: ['production-orders.read'] },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.findForEntities).not.toHaveBeenCalled();
  });

  it('does not grant dedicated phiếu permissions through the general order read permission', async () => {
    for (const resource of [
      'date-check',
      'filtration-check',
      'steam-sterilization-check',
      'material-summary',
      'post-secondary-packaging-summary',
      'production-order-deviation',
      'equipment-monitoring-record',
    ]) {
      await expect(
        service.findHistory(
          resource,
          7,
          {},
          { permissions: ['production-orders.read'] },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('includes nested and deleted mixing steps/parameters using their recorded ownership', async () => {
    delegates.productionOrderMixingRecordStages.findMany.mockResolvedValue([
      { id: 11 },
    ]);
    delegates.productionOrderMixingRecordSteps.findMany.mockResolvedValue([
      { id: 21 },
    ]);
    delegates.productionOrderMixingRecordParameters.findMany.mockResolvedValue([
      { id: 31 },
    ]);
    audit.findHistoricalEntityIds.mockImplementation((table: string) =>
      Promise.resolve(
        table === 'production_order_mixing_record_stages'
          ? [12]
          : table === 'production_order_mixing_record_parameters'
            ? [32]
            : [],
      ),
    );
    await service.findHistory(
      'mixing-record',
      7,
      {},
      { permissions: ['production-orders.read'] },
    );
    expect(
      delegates.productionOrderMixingRecordSteps.findMany,
    ).toHaveBeenCalledWith({
      where: { production_order_mixing_record_stage_id: { in: [11, 12] } },
      select: { id: true },
    });
    expect(audit.findForEntities).toHaveBeenCalledWith(
      [
        { entityType: 'production_order_mixing_records', ids: [7] },
        { entityType: 'production_order_mixing_record_stages', ids: [11, 12] },
        { entityType: 'production_order_mixing_record_steps', ids: [21] },
        {
          entityType: 'production_order_mixing_record_parameters',
          ids: [31, 32],
        },
      ],
      {},
    );
  });

  it('keeps order history separate from forms with other read permissions', async () => {
    await service.findHistory(
      'production-order',
      7,
      {},
      { permissions: ['production-orders.read'] },
    );
    expect(audit.findForEntities).toHaveBeenCalledWith(
      [{ entityType: 'production_orders', ids: [7] }],
      {},
    );
    expect(audit.findHistoricalEntityIds).not.toHaveBeenCalled();
  });

  it('uses the actual record ID for cylinder calibration, independently of its order ID', async () => {
    delegates.productionOrderCylinderCalibrations.findUnique.mockResolvedValue({
      id: 25,
    });
    await service.findHistory(
      'cylinder-calibration',
      25,
      {},
      { permissions: ['production-orders.read'] },
    );
    expect(audit.findForEntities).toHaveBeenCalledWith(
      [{ entityType: 'production_order_cylinder_calibrations', ids: [25] }],
      {},
    );
  });

  it('checks the parent order scope before collecting an entire section history', async () => {
    delegates.productionOrders.findUnique.mockResolvedValue(null);
    await expect(
      service.findHistory(
        'date-check',
        7,
        { scope: 'production-order' },
        { permissions: ['production-orders.date-checks.read'] },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.findHistoricalEntityIds).not.toHaveBeenCalled();
    expect(audit.findForEntities).not.toHaveBeenCalled();
  });

  it('includes removed records in section history without accepting arbitrary entity filters', async () => {
    delegates.productionOrderVialInspectionChecks.findMany.mockResolvedValue([
      { id: 11 },
    ]);
    audit.findHistoricalEntityIds.mockResolvedValue([12]);
    await service.findHistory(
      'vial-inspection-check',
      7,
      { scope: 'production-order' },
      { permissions: ['production-orders.read'] },
    );
    expect(audit.findHistoricalEntityIds).toHaveBeenCalledWith(
      'production_order_vial_inspection_checks',
      'production_order_id',
      [7],
    );
    expect(audit.findForEntities).toHaveBeenCalledWith(
      [
        {
          entityType: 'production_order_vial_inspection_checks',
          ids: [11, 12],
        },
      ],
      { scope: 'production-order' },
    );
  });

  it('supports the role permission shape used by existing guards', async () => {
    await service.findHistory(
      'density-check',
      7,
      {},
      {
        userRoles: [
          {
            roles: {
              rolePermissions: [
                { permissions: { name: 'production-orders.read' } },
              ],
            },
          },
        ],
      },
    );
    expect(audit.findForEntities).toHaveBeenCalled();
  });
});
