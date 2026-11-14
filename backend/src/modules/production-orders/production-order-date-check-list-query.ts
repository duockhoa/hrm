import { Prisma } from '@prisma/client';
import {
  literalContains,
  recordDateRange,
  recordSearchTerms,
  searchDocumentId,
  searchLotFields,
  searchUserFields,
} from '../../common/utils/record-list-query';
import { GetProductionOrderDateChecksDto } from './dto/get-production-order-date-checks.dto';

const packageLabels: Record<string, string> = {
  goi: 'Gói',
  lo: 'Lọ',
  chai: 'Chai',
  hop: 'Hộp',
  thung: 'Thùng',
  ong_be: 'Ống bẻ',
  tui_nhom: 'Túi nhôm',
  tuyp: 'Tuýp',
};
const approvalLabels: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};
const normalizeLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
const matchingLabels = (labels: Record<string, string>, term: string) =>
  Object.entries(labels)
    .filter(([, label]) => normalizeLabel(label).includes(normalizeLabel(term)))
    .map(([code]) => code);

export function productionOrderDateCheckListWhere(
  options: GetProductionOrderDateChecksDto,
): Prisma.ProductionOrderDateChecksWhereInput {
  const where: Prisma.ProductionOrderDateChecksWhereInput = {};
  if (options.production_order_id !== undefined)
    where.production_order_id = options.production_order_id;
  if (options.approval_status) where.approval_status = options.approval_status;
  if (options.package_type) where.package_type = options.package_type;
  if (options.created_by_id !== undefined)
    where.created_by_id = options.created_by_id;
  if (options.approved_by_id !== undefined)
    where.approved_by_id = options.approved_by_id;
  if (options.item_code)
    where.productionOrder = { is: { item_code: options.item_code } };
  if (options.has_images !== undefined)
    where.images = options.has_images === 'true' ? { some: {} } : { none: {} };
  const range = recordDateRange(options);
  if (range) where[options.date_field ?? 'created_at'] = range;
  const and = recordSearchTerms(options.search).map(
    (term): Prisma.ProductionOrderDateChecksWhereInput => {
      const contains = literalContains(term);
      const id = searchDocumentId(term);
      const packages = matchingLabels(packageLabels, term);
      const approvals = matchingLabels(approvalLabels, term);
      return {
        OR: [
          { package_type: contains },
          { approval_status: contains },
          { productionOrder: { is: searchLotFields(term) } },
          { createdBy: { is: searchUserFields(term) } },
          { approvedBy: { is: searchUserFields(term) } },
          ...(packages.length ? [{ package_type: { in: packages } }] : []),
          ...(approvals.length ? [{ approval_status: { in: approvals } }] : []),
          ...(id !== undefined ? [{ id }] : []),
        ],
      };
    },
  );
  if (and.length) where.AND = and;
  return where;
}
