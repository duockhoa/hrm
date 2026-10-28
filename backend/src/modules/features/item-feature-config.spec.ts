import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildItemFeatureConfig,
  createFeatureConfigSnapshot,
  readFeatureConfigSnapshot,
  deriveSectionActivation,
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

  it('derives section activation from any enabled linked action, ignoring old section flags', () => {
    const action = {
      ...section,
      feature_id: 2,
      key: 'create_check',
      kind: 'action',
    };
    const derive = (enabled: boolean) =>
      deriveSectionActivation([
        { ...action, enabled },
        {
          ...section,
          enabled: !enabled,
          required: true,
          source_actions: sourceActions,
        },
        { ...section, feature_id: 11, key: 'unlinked', source_actions: [] },
        {
          ...section,
          feature_id: 12,
          key: 'production_order_lines',
          enabled: false,
        },
      ]);
    expect(derive(true).map(({ enabled }) => enabled)).toEqual([
      true,
      true,
      false,
      true,
    ]);
    expect(derive(false)[1]).toMatchObject({ enabled: false, required: false });
    const multiple = deriveSectionActivation([
      { ...action, enabled: false },
      { ...action, feature_id: 3, key: 'import_check', enabled: true },
      {
        ...section,
        source_actions: [
          ...sourceActions,
          { id: 3, key: 'import_check', label: 'Import', order: 1 },
        ],
      },
    ]);
    expect(multiple[2].enabled).toBe(true);
  });

  it('freezes derived activation in new snapshots while keeping old snapshots unchanged', () => {
    const inactive = {
      ...section,
      enabled: false,
      source_actions: sourceActions,
    };
    const entries = deriveSectionActivation([
      inactive,
      { ...section, feature_id: 2, key: 'create_check', kind: 'action' },
    ]);
    const snapshot = createFeatureConfigSnapshot(
      buildItemFeatureConfig('TP01', entries),
      new Date(),
    );
    expect(
      readFeatureConfigSnapshot(
        JSON.parse(JSON.stringify(snapshot)) as Prisma.JsonValue,
        'TP01',
      )?.sections[0].enabled,
    ).toBe(true);
    expect(
      readFeatureConfigSnapshot(
        { version: 2, item_code: 'TP01', features: [inactive] },
        'TP01',
      )?.sections[0].enabled,
    ).toBe(false);
  });

  it('requires a section if any enabled linked action is required, ignoring section preferences', () => {
    const action = {
      ...section,
      feature_id: 2,
      key: 'create_check',
      kind: 'action',
      required: true,
    };
    const derive = (enabled: boolean, required: boolean) =>
      deriveSectionActivation([
        { ...section, required: true, source_actions: sourceActions },
        { ...action, enabled, required },
      ])[0];
    expect(derive(true, true)).toMatchObject({ enabled: true, required: true });
    expect(derive(true, false)).toMatchObject({
      enabled: true,
      required: false,
    });
    expect(derive(false, true)).toMatchObject({
      enabled: false,
      required: false,
    });
    const multiple = deriveSectionActivation([
      {
        ...section,
        source_actions: [
          ...sourceActions,
          { id: 3, key: 'import_check', label: 'Import', order: 1 },
        ],
      },
      { ...action, required: false },
      { ...action, feature_id: 3, key: 'import_check' },
    ]);
    expect(multiple[0].required).toBe(true);
    const snapshot = createFeatureConfigSnapshot(
      buildItemFeatureConfig('TP01', multiple),
      new Date(),
    );
    expect(
      readFeatureConfigSnapshot(
        JSON.parse(JSON.stringify(snapshot)) as Prisma.JsonValue,
        'TP01',
      )?.sections[0].required,
    ).toBe(true);
  });

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
