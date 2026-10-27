import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildItemFeatureConfig,
  createFeatureConfigSnapshot,
  readFeatureConfigSnapshot,
} from './item-feature-config';

describe('section action snapshots', () => {
  const section = {
    feature_id: 10,
    key: 'checks',
    kind: 'section',
    label: 'Checks',
    group_name: null,
    order: 0,
    enabled: true,
    required: false,
  };
  const sourceActions = [
    { id: 2, key: 'create_check', label: 'Create check', order: 0 },
  ];

  it('round-trips ordered action references independently of later catalog changes', () => {
    const config = buildItemFeatureConfig('TP01', [
      { ...section, source_actions: sourceActions },
    ]);
    const snapshot = JSON.parse(
      JSON.stringify(
        createFeatureConfigSnapshot(config, new Date('2026-10-27T00:00:00Z')),
      ),
    ) as Prisma.JsonValue;
    const result = readFeatureConfigSnapshot(snapshot, 'TP01');
    expect(result?.snapshot.version).toBe(2);
    expect(result?.sections[0].source_actions).toEqual(sourceActions);
  });

  it('preserves unknown links in legacy snapshots without inferring from current settings', () => {
    const result = readFeatureConfigSnapshot(
      { version: 1, item_code: 'TP01', features: [section] },
      'TP01',
    );
    expect(result?.sections[0].source_actions).toBeUndefined();
    expect(result?.snapshot.version).toBe(1);
  });

  it('writes an explicit empty list for new snapshots without links', () => {
    const snapshot = createFeatureConfigSnapshot(
      buildItemFeatureConfig('TP01', [section]),
      new Date(),
    );
    const result = readFeatureConfigSnapshot(
      JSON.parse(JSON.stringify(snapshot)) as Prisma.JsonValue,
      'TP01',
    );
    expect(result?.sections[0].source_actions).toEqual([]);
  });

  it.each([
    undefined,
    null,
    'bad',
    [{ id: '2', key: 'create', label: 'Create', order: 0 }],
    [...sourceActions, ...sourceActions],
  ])('rejects malformed version 2 links %p', (source_actions) => {
    const snapshot = {
      version: 2,
      item_code: 'TP01',
      features: [{ ...section, source_actions }],
    } as unknown as Prisma.JsonValue;
    expect(() => readFeatureConfigSnapshot(snapshot, 'TP01')).toThrow(
      InternalServerErrorException,
    );
  });

  it('rejects source links on non-section entries', () => {
    expect(() =>
      readFeatureConfigSnapshot(
        {
          version: 2,
          item_code: 'TP01',
          features: [
            { ...section, kind: 'action', source_actions: sourceActions },
          ],
        },
        'TP01',
      ),
    ).toThrow(InternalServerErrorException);
  });
});
