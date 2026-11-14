import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GetProductionOrderListDto } from './dto/get-production-order-list.dto';

// Prisma contains uses SQL LIKE. Escape LIKE metacharacters so user input is literal.
export const escapeLotSearch = (value: string) =>
  value.replace(/[\\%_]/g, '\\$&');

export function productionOrderListWhere(
  finished: boolean,
  options: GetProductionOrderListDto,
): Prisma.ProductionOrdersWhereInput {
  const where: Prisma.ProductionOrdersWhereInput = {
    item_code: finished ? { startsWith: 'TP' } : { not: { startsWith: 'TP' } },
  };
  const and: Prisma.ProductionOrdersWhereInput[] = [];
  if (options.item_code) and.push({ item_code: options.item_code });
  if (options.status) and.push({ status: options.status });

  const terms = [
    ...new Set(
      (options.search ?? '')
        .normalize('NFC')
        .trim()
        .split(/\s+/u)
        .filter(Boolean),
    ),
  ];
  if (terms.length > 10) {
    throw new BadRequestException('search must contain at most 10 terms');
  }
  for (const term of terms) {
    const contains = escapeLotSearch(term);
    const or: Prisma.ProductionOrdersWhereInput[] = [
      { lot_no: { contains } },
      { production_order_code: { contains } },
      { item_code: { contains } },
      { description: { contains } },
      { item: { is: { item_name: { contains } } } },
    ];
    // Numeric terms also match the exact SAP document number; leading zeros are allowed.
    if (/^\d+$/.test(term) && Number(term) <= 2147483647) {
      or.push({ id: Number(term) });
    }
    and.push({ OR: or });
  }

  if (
    options.from_date &&
    options.to_date &&
    options.from_date > options.to_date
  ) {
    throw new BadRequestException('from_date must be on or before to_date');
  }
  if (options.from_date || options.to_date) {
    const field = options.date_field ?? 'creation_date';
    if (field === 'date_manufacture') {
      // SAP manufacture dates are stored as ISO date strings (optionally with time).
      const end = options.to_date
        ? new Date(`${options.to_date}T00:00:00.000Z`)
        : undefined;
      end?.setUTCDate(end.getUTCDate() + 1);
      and.push({
        date_manufacture: {
          ...(options.from_date ? { gte: options.from_date } : {}),
          ...(end ? { lt: end.toISOString().slice(0, 10) } : {}),
        },
      });
    } else {
      const end = options.to_date
        ? new Date(`${options.to_date}T00:00:00.000Z`)
        : undefined;
      end?.setUTCDate(end.getUTCDate() + 1);
      and.push({
        [field]: {
          ...(options.from_date
            ? { gte: new Date(`${options.from_date}T00:00:00.000Z`) }
            : {}),
          ...(end ? { lt: end } : {}),
        },
      });
    }
  }
  if (and.length) where.AND = and;
  return where;
}
