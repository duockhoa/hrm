import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Limits = { lower_limit?: unknown; upper_limit?: unknown };

export function normalizeCheckLimits(
  dto: Limits,
  decimalPlaces: number,
  existing?: Limits,
) {
  const data: {
    lower_limit?: Prisma.Decimal | null;
    upper_limit?: Prisma.Decimal | null;
  } = {};

  for (const field of ['lower_limit', 'upper_limit'] as const) {
    if (existing && !(field in dto)) continue;
    const value = dto[field];
    if (value == null || (typeof value === 'string' && !value.trim())) {
      data[field] = null;
      continue;
    }
    const normalized =
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';
    if (
      !new RegExp(
        `^\\d{1,${10 - decimalPlaces}}(?:\\.\\d{1,${decimalPlaces}})?$`,
      ).test(normalized)
    ) {
      throw new BadRequestException(
        `${field} must be non-negative and fit DECIMAL(10, ${decimalPlaces})`,
      );
    }
    data[field] = new Prisma.Decimal(normalized);
  }

  const lower =
    'lower_limit' in data ? data.lower_limit : existing?.lower_limit;
  const upper =
    'upper_limit' in data ? data.upper_limit : existing?.upper_limit;
  if (
    lower != null &&
    upper != null &&
    new Prisma.Decimal(String(lower)).gt(String(upper))
  ) {
    throw new BadRequestException(
      'lower_limit must be less than or equal to upper_limit',
    );
  }
  return data;
}
