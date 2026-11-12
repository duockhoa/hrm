import { BadRequestException } from '@nestjs/common';

export type ListItemsQuery = Record<string, unknown>;

export const ITEM_SELECT_FIELDS = [
  'item_code',
  'item_name',
  'unit',
  'dk_code',
  'series',
  'registration_id',
  'created_at',
  'update_at',
  'deleted_at',
] as const;
export const ITEM_EXPAND_FIELDS = [
  'registration',
  'productionSpecification',
] as const;

type ItemField = (typeof ITEM_SELECT_FIELDS)[number];
type ItemExpansion = (typeof ITEM_EXPAND_FIELDS)[number];

export type ParsedItemsQuery = {
  skip?: number;
  top?: number;
  search?: string;
  codePrefix?: string;
  series?: number[];
  registrationId?: number;
  hasRegistration?: boolean;
  select?: ItemField[];
  expand?: ItemExpansion[];
  orderBy: { field: ItemField; direction: 'asc' | 'desc' }[];
  count: boolean;
};

export function parseItemsQuery(query: ListItemsQuery): ParsedItemsQuery {
  const allowed = new Set([
    'skip',
    'top',
    'search',
    'codePrefix',
    'series',
    'registrationId',
    'hasRegistration',
    'select',
    'orderBy',
    'count',
    'expand',
  ]);
  for (const key of Object.keys(query)) {
    if (!allowed.has(key))
      throw new BadRequestException(`Unknown query parameter: ${key}`);
    if (typeof query[key] !== 'string') {
      throw new BadRequestException(`${key} must be a single string value`);
    }
  }

  const text = (key: string) => (query[key] as string | undefined)?.trim();
  const integer = (value: string, key: string, min = 0, max = 2147483647) => {
    if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
      throw new BadRequestException(
        `${key} must be an integer from ${min} to ${max}`,
      );
    }
    return Number(value);
  };
  const boolean = (key: string) => {
    const value = text(key);
    if (value === undefined) return undefined;
    if (value !== 'true' && value !== 'false') {
      throw new BadRequestException(`${key} must be true or false`);
    }
    return value === 'true';
  };
  const list = (key: string, max: number) => {
    const values = text(key)!
      .split(',')
      .map((value) => value.trim());
    if (values.length > max || values.some((value) => !value)) {
      throw new BadRequestException(
        `${key} must contain 1 to ${max} comma-separated values`,
      );
    }
    return [...new Set(values)];
  };
  const fieldList = <T extends string>(
    key: string,
    fields: readonly T[],
  ): T[] => {
    return list(key, fields.length).map((value) => {
      if (!fields.includes(value as T)) {
        throw new BadRequestException(`Unsupported ${key} field: ${value}`);
      }
      return value as T;
    });
  };

  const result: ParsedItemsQuery = {
    orderBy: [],
    count: boolean('count') ?? false,
  };
  if (query.skip !== undefined) result.skip = integer(text('skip')!, 'skip');
  if (query.top !== undefined)
    result.top = integer(text('top')!, 'top', 1, 200);
  else if (result.skip !== undefined) result.top = 50;
  if (text('search')) {
    if (text('search')!.length > 200)
      throw new BadRequestException('search must not exceed 200 characters');
    result.search = text('search');
  }
  if (text('codePrefix')) {
    if (!/^[a-z]+$/i.test(text('codePrefix')!)) {
      throw new BadRequestException('codePrefix must contain letters only');
    }
    result.codePrefix = text('codePrefix')!.toUpperCase();
  }
  if (query.series !== undefined) {
    result.series = [
      ...new Set(list('series', 100).map((value) => integer(value, 'series'))),
    ];
  }
  if (query.registrationId !== undefined) {
    result.registrationId = integer(
      text('registrationId')!,
      'registrationId',
      1,
    );
  }
  result.hasRegistration = boolean('hasRegistration');
  if (query.select !== undefined)
    result.select = fieldList('select', ITEM_SELECT_FIELDS);
  if (query.expand !== undefined) {
    result.expand =
      text('expand') === 'none' ? [] : fieldList('expand', ITEM_EXPAND_FIELDS);
  }
  if (query.orderBy !== undefined) {
    const usedFields = new Set<string>();
    for (const value of list('orderBy', ITEM_SELECT_FIELDS.length)) {
      const [field, direction, extra] = value.split(':');
      if (
        !ITEM_SELECT_FIELDS.includes(field as ItemField) ||
        (direction !== 'asc' && direction !== 'desc') ||
        extra !== undefined ||
        usedFields.has(field)
      )
        throw new BadRequestException(`Invalid orderBy expression: ${value}`);
      usedFields.add(field);
      result.orderBy.push({ field: field as ItemField, direction });
    }
  }
  if (!result.orderBy.some(({ field }) => field === 'item_code')) {
    result.orderBy.push({ field: 'item_code', direction: 'asc' });
  }
  return result;
}
