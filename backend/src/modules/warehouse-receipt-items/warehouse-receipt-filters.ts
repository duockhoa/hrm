import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  literalContains,
  searchUserFields,
} from '../../common/utils/record-list-query';
import { WarehouseReceiptListQueryDto } from './dto/warehouse-receipt-list-query.dto';

function dateRange(from?: string, to?: string, timeZone = '+00:00') {
  if (from && to && from > to)
    throw new BadRequestException(
      'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.',
    );
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00${timeZone}`) } : {}),
    ...(to
      ? {
          lt: new Date(
            new Date(`${to}T00:00:00${timeZone}`).getTime() + 86400000,
          ),
        }
      : {}),
  };
}

function quantityRange(min?: string, max?: string) {
  if (min && max && new Prisma.Decimal(min).gt(max))
    throw new BadRequestException(
      'Số lượng từ phải nhỏ hơn hoặc bằng số lượng đến.',
    );
  return { ...(min ? { gte: min } : {}), ...(max ? { lte: max } : {}) };
}

export function warehouseReceiptFilters(
  options: WarehouseReceiptListQueryDto,
): Prisma.WarehouseReceiptItemsWhereInput[] {
  const filters: Prisma.WarehouseReceiptItemsWhereInput[] = [];
  for (const field of [
    'lot_number',
    'manufacturer_lot_number',
    'unit',
  ] as const)
    if (options[field])
      filters.push({ [field]: literalContains(options[field]) });
  if (options.item_name)
    filters.push({
      item: { is: { item_name: literalContains(options.item_name) } },
    });
  if (options.supplier) {
    const contains = literalContains(options.supplier);
    filters.push({
      OR: [
        { supplier_code: contains },
        { supplier_name: contains },
        { supplier: { is: { card_name: contains } } },
      ],
    });
  }
  if (options.manufacturer) {
    const contains = literalContains(options.manufacturer);
    filters.push({
      OR: [
        { manufacturer_code: contains },
        { manufacturer_name: contains },
        { manufacturer: { is: { manufacturer_name: contains } } },
      ],
    });
  }
  if (options.entered_by)
    filters.push({ enteredBy: { is: searchUserFields(options.entered_by) } });
  if (options.from_date || options.to_date)
    filters.push({
      received_at: dateRange(options.from_date, options.to_date, '+07:00'),
    });
  if (options.expiry_from || options.expiry_to)
    filters.push({
      expiry_date: dateRange(options.expiry_from, options.expiry_to),
    });
  if (options.quantity_min || options.quantity_max)
    filters.push({
      quantity: quantityRange(options.quantity_min, options.quantity_max),
    });
  if (options.actual_quantity_min || options.actual_quantity_max)
    filters.push({
      actual_quantity: quantityRange(
        options.actual_quantity_min,
        options.actual_quantity_max,
      ),
    });
  if (options.counting_method)
    filters.push({ counting_method: options.counting_method });
  if (options.sensory_status)
    filters.push({
      sensory_passed:
        options.sensory_status === 'unrecorded'
          ? null
          : options.sensory_status === 'pass',
    });
  for (const type of [
    'dispatch_note',
    'coa',
    'invoice',
    'original_label',
  ] as const) {
    const status = options[`${type}_status`];
    if (status)
      filters.push({
        attachments:
          status === 'has'
            ? { some: { attachment_type: type } }
            : { none: { attachment_type: type } },
      });
  }
  if (options.sampling_status)
    filters.push({
      samplingRequest:
        options.sampling_status === 'sent' ? { isNot: null } : { is: null },
    });
  if (options.sap_status)
    filters.push({
      sapConfirmation:
        options.sap_status === 'entered' ? { isNot: null } : { is: null },
    });
  return filters;
}
