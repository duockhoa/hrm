import type { Prisma } from '@prisma/client';
import {
  literalContains,
  recordPagination,
  recordSearchTerms,
  searchDocumentId,
  searchLotFields,
} from 'src/common/utils/record-list-query';
import type { GetPendingIpcRecordsDto } from './dto/get-pending-ipc-records.dto';

const sentSamplingRequest = { status: 'sent' };

const pendingIpcRecordSelect = {
  id: true,
  description: true,
  qa_staff_approved_at: true,
  productionOrder: {
    select: {
      id: true,
      production_order_code: true,
      item_code: true,
      lot_no: true,
      planned_quatity: true,
      unit: true,
      item: { select: { item_name: true } },
      samplingRequests: {
        where: sentSamplingRequest,
        orderBy: [{ sent_at: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { sent_at: true },
      },
    },
  },
} satisfies Prisma.ProductionOrderMixingRecordsSelect &
  Prisma.ProductionOrderWeighingRecordsSelect;

export function pendingIpcRecordsQuery({
  page = 1,
  limit = 25,
  search,
}: GetPendingIpcRecordsDto) {
  const where = {
    ipc_staff_approved_by_id: null,
    ipc_staff_approved_at: null,
    // PYCLM is sent for a production order, shared by its records.
    productionOrder: {
      is: { samplingRequests: { some: sentSamplingRequest } },
    },
    AND: recordSearchTerms(search).map((term) => {
      const id = searchDocumentId(term.replace(/^#/, ''));
      return {
        OR: [
          ...(id !== undefined ? [{ id }] : []),
          { description: literalContains(term) },
          { productionOrder: { is: searchLotFields(term) } },
        ],
      };
    }),
  } satisfies Prisma.ProductionOrderMixingRecordsWhereInput &
    Prisma.ProductionOrderWeighingRecordsWhereInput;

  return {
    where,
    select: pendingIpcRecordSelect,
    orderBy: [{ created_at: 'desc' as const }, { id: 'desc' as const }],
    ...recordPagination({ page, limit }).args,
  };
}
