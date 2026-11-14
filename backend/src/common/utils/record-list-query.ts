import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RecordListQueryDto } from '../dto/record-list-query.dto';

export function recordSearchTerms(search?: string) {
  const terms = [
    ...new Set(
      (search ?? '').normalize('NFC').trim().split(/\s+/u).filter(Boolean),
    ),
  ];
  if (terms.length > 10)
    throw new BadRequestException('search must contain at most 10 terms');
  return terms;
}

export const literalContains = (term: string) => ({
  contains: term.replace(/[\\%_]/g, '\\$&'),
});
export const searchDocumentId = (term: string) =>
  /^\d+$/.test(term) && Number(term) <= 2147483647 ? Number(term) : undefined;

export function recordDateRange(
  options: RecordListQueryDto,
): Prisma.DateTimeFilter | undefined {
  if (
    options.from_date &&
    options.to_date &&
    options.from_date > options.to_date
  ) {
    throw new BadRequestException('from_date must be on or before to_date');
  }
  if (!options.from_date && !options.to_date) return undefined;
  const end = options.to_date
    ? new Date(`${options.to_date}T00:00:00.000Z`)
    : undefined;
  end?.setUTCDate(end.getUTCDate() + 1);
  return {
    ...(options.from_date
      ? { gte: new Date(`${options.from_date}T00:00:00.000Z`) }
      : {}),
    ...(end ? { lt: end } : {}),
  };
}

export function recordPagination(options: RecordListQueryDto) {
  const enabled = options.page !== undefined || options.limit !== undefined;
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const args: { skip?: number; take?: number } = enabled
    ? { skip: (page - 1) * limit, take: limit }
    : {};
  return { enabled, page, limit, args };
}

export function searchLotFields(
  term: string,
): Prisma.ProductionOrdersWhereInput {
  const contains = literalContains(term);
  const id = searchDocumentId(term);
  return {
    OR: [
      { lot_no: contains },
      { production_order_code: contains },
      { item_code: contains },
      { description: contains },
      { item: { is: { item_name: contains } } },
      ...(id !== undefined ? [{ id }] : []),
    ],
  };
}

export function searchUserFields(term: string): Prisma.UsersWhereInput {
  const contains = literalContains(term);
  return {
    OR: [{ name: contains }, { username: contains }, { email: contains }],
  };
}
