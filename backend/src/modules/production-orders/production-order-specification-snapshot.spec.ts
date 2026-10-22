import {
  createProductionSpecificationSnapshot,
  readProductionSpecificationSnapshot,
  resolveProductionOrderSpecification,
} from './production-order-specification-snapshot';
import { specificationFixture } from './production-specification.fixture';
import { Prisma } from '@prisma/client';

describe('production order specification snapshot', () => {
  const capturedAt = new Date('2026-10-22T01:00:00.000Z');

  it('keeps exact decimals, operators, units and dosage requirements after the master changes', () => {
    const current = specificationFixture();
    const snapshot = createProductionSpecificationSnapshot(
      'TP00063',
      current,
      capturedAt,
      7,
    );
    current.upper_control_limit = new Prisma.Decimal('99');
    current.dosageForm.sensory_requirement = 'Yêu cầu mới';
    const resolved = resolveProductionOrderSpecification({
      item_code: 'TP00063',
      item: { productionSpecification: current },
      documentControl: {
        production_specification_snapshot: snapshot as Prisma.JsonObject,
      },
    });
    expect(resolved).toMatchObject({
      productionSpecificationSource: 'snapshot',
      productionSpecificationCapturedAt: capturedAt.toISOString(),
      productionSpecification: {
        upper_control_limit: '12.654321',
        upper_control_limit_operator: '<=',
        unit: 'g',
        disintegration_time_allowed_limit: '45',
        disintegration_time_unit: 'phút',
        dosageForm: { sensory_requirement: 'Viên nguyên vẹn' },
      },
    });
  });

  it('keeps a missing specification empty even when one is subsequently added', () => {
    const snapshot = createProductionSpecificationSnapshot(
      'TP00063',
      null,
      capturedAt,
      7,
    );
    expect(
      resolveProductionOrderSpecification({
        item_code: 'TP00063',
        item: { productionSpecification: specificationFixture() },
        documentControl: {
          production_specification_snapshot: snapshot as Prisma.JsonObject,
        },
      }).productionSpecification,
    ).toBeNull();
  });

  it('uses current settings for legacy lots without a snapshot, ignoring deleted specifications', () => {
    const specification = specificationFixture();
    const order = {
      item_code: 'TP00063',
      item: { productionSpecification: specification },
    };
    expect(
      resolveProductionOrderSpecification(order).productionSpecification,
    ).toBe(specification);
    specification.deleted_at = new Date();
    expect(
      resolveProductionOrderSpecification(order).productionSpecification,
    ).toBeNull();
    expect(
      readProductionSpecificationSnapshot(
        createProductionSpecificationSnapshot(
          'TP00063',
          specification,
          capturedAt,
          7,
        ) as Prisma.JsonObject,
        'TP00063',
      )?.specification,
    ).toBeNull();
  });

  it.each([
    { version: 99 },
    {
      ...createProductionSpecificationSnapshot('TP00063', null, capturedAt, 7),
      item_code: 'OTHER',
    },
    {
      ...createProductionSpecificationSnapshot('TP00063', null, capturedAt, 7),
      specification: { item_code: 'TP00063' },
    },
  ])(
    'rejects an invalid snapshot without falling back to current settings',
    (snapshot) => {
      expect(() =>
        readProductionSpecificationSnapshot(
          snapshot as Prisma.JsonObject,
          'TP00063',
        ),
      ).toThrow('Invalid production order specification snapshot');
    },
  );
});
