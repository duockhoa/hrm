import { Prisma } from '@prisma/client';
import {
  literalContains,
  recordDateRange,
  recordSearchTerms,
  searchDocumentId,
  searchLotFields,
  searchUserFields,
} from '../../common/utils/record-list-query';
import { GetProductionOrderDeviationsDto } from './dto/get-production-order-deviations.dto';

export function productionOrderDeviationListWhere(
  options: GetProductionOrderDeviationsDto,
): Prisma.ProductionOrderDeviationsWhereInput {
  const where: Prisma.ProductionOrderDeviationsWhereInput = {
    production_order_id: options.production_order_id,
    deleted_at: null,
  };
  if (options.reporter_id !== undefined)
    where.reporter_id = options.reporter_id;
  if (options.approver_id !== undefined)
    where.approver_id = options.approver_id;
  if (options.cause_classification)
    where.cause_classification = options.cause_classification;
  if (options.item_code)
    where.productionOrder = { is: { item_code: options.item_code } };
  const range = recordDateRange(options);
  if (range) where[options.date_field ?? 'created_at'] = range;
  const and = recordSearchTerms(options.search).map(
    (term): Prisma.ProductionOrderDeviationsWhereInput => {
      const contains = literalContains(term);
      const id = searchDocumentId(term);
      return {
        OR: [
          { deviation_content: contains },
          { handling_plan: contains },
          { handling_result: contains },
          { cause: contains },
          { cause_classification: contains },
          { productionOrder: { is: searchLotFields(term) } },
          { reporter: { is: searchUserFields(term) } },
          { approver: { is: searchUserFields(term) } },
          ...(id !== undefined ? [{ id }] : []),
        ],
      };
    },
  );
  if (and.length) where.AND = and;
  return where;
}
