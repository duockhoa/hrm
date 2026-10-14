import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type ItemFeatureConfigEntry = {
  feature_id: number;
  key: string;
  kind: string;
  label: string;
  group_name: string | null;
  order: number;
  enabled: boolean;
  required: boolean;
};

export const buildItemFeatureConfig = (
  item_code: string,
  features: ItemFeatureConfigEntry[],
) => ({
  item_code,
  actions: features.filter((feature) => feature.kind === 'action'),
  sections: features.filter((feature) => feature.kind === 'section'),
  features,
});

export type ItemFeatureConfig = ReturnType<typeof buildItemFeatureConfig>;

export const createFeatureConfigSnapshot = (
  config: ItemFeatureConfig,
  capturedAt: Date,
): Prisma.InputJsonObject => ({
  version: 1,
  source: 'issued',
  captured_at: capturedAt.toISOString(),
  item_code: config.item_code,
  features: config.features,
});

// A stored snapshot is authoritative. Never silently replace an unreadable
// snapshot with today's item settings, which could change an old lot's rules.
export const readFeatureConfigSnapshot = (
  value: Prisma.JsonValue | null | undefined,
  itemCode: string,
):
  | (ItemFeatureConfig & { snapshot: { version: number; source: string } })
  | null => {
  if (value == null) return null;
  if (
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.version !== 1 ||
    value.item_code !== itemCode ||
    !Array.isArray(value.features)
  ) {
    throw new InternalServerErrorException(
      'Invalid production order feature snapshot',
    );
  }

  const features = value.features.map((entry): ItemFeatureConfigEntry => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      typeof entry.feature_id !== 'number' ||
      typeof entry.key !== 'string' ||
      typeof entry.kind !== 'string' ||
      typeof entry.label !== 'string' ||
      typeof entry.order !== 'number' ||
      typeof entry.enabled !== 'boolean' ||
      typeof entry.required !== 'boolean' ||
      (entry.group_name !== null && typeof entry.group_name !== 'string')
    ) {
      throw new InternalServerErrorException(
        'Invalid production order feature snapshot entry',
      );
    }
    return {
      feature_id: entry.feature_id,
      key: entry.key,
      kind: entry.kind,
      label: entry.label,
      group_name: entry.group_name,
      order: entry.order,
      enabled: entry.enabled,
      required: entry.required,
    };
  });

  return {
    ...buildItemFeatureConfig(itemCode, features),
    snapshot: {
      version: 1,
      source: typeof value.source === 'string' ? value.source : 'issued',
    },
  };
};

export const assertRequiredSection = (
  feature: { key: string; kind: string },
  enabled: boolean,
  required: boolean,
  supported: boolean,
) => {
  if (required && (feature.kind !== 'section' || !supported)) {
    throw new BadRequestException(
      'Chỉ section có quy tắc kiểm tra dữ liệu mới được đặt bắt buộc.',
    );
  }
  if (required && !enabled) {
    throw new BadRequestException(
      'Phải bật section trước khi đặt bắt buộc có dữ liệu.',
    );
  }
};
