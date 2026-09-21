const BTP_HOAN_THIEN_EXPORT = { sheetName: 'TỔNG KẾT BTP HOÀN THIỆN', headerRows: 2, columns: 21 };

function xuatTongKetBtpHoanThien() {
  const rows = fetchAllDataExportPages_('post-secondary-packaging-summaries').map(mapBtpHoanThienRow_);
  const sheet = getDataExportSheet_(BTP_HOAN_THIEN_EXPORT.sheetName);
  const startRow = BTP_HOAN_THIEN_EXPORT.headerRows + 1;
  clearDataExportRows_(sheet, startRow, BTP_HOAN_THIEN_EXPORT.columns);
  if (!rows.length) return;
  ensureDataExportRows_(sheet, startRow + rows.length - 1);
  sheet.getRange(startRow, 5, rows.length, 1).setNumberFormat('@');
  sheet.getRange(startRow, 8, rows.length, 1).setNumberFormat('@');
  sheet.getRange(startRow, 1, rows.length, BTP_HOAN_THIEN_EXPORT.columns).setValues(rows);
}

function mapBtpHoanThienRow_(item) {
  const po = item.productionOrder || {}, product = po.item || {};
  const semiOrder = item.semiFinishedProductOrder || {}, semiProduct = semiOrder.item || {};
  const productCode = product.item_code || po.item_code || '', productLot = po.lot_no || '';
  const semiCode = semiProduct.item_code || semiOrder.item_code || '', semiLot = semiOrder.lot_no || '';
  const sum = function(rows, field) { return Array.isArray(rows) && rows.length ? rows.reduce(function(total, row) { return total + (Number(row[field]) || 0); }, 0) : ''; };
  const join = function(rows, field) { return Array.isArray(rows) ? rows.map(function(row) { return row[field]; }).filter(Boolean).join(', ') : ''; };
  const processing = item.pendingProcessItems || [], cancellation = item.pendingCancellationItems || [];
  return [dataExportDateTime_(item.created_at), dataExportJoin_([productCode, productLot], '-'), dataExportText_(productCode), dataExportText_(product.item_name || po.description), dataExportText_(productLot), dataExportText_(semiCode), dataExportText_(semiProduct.item_name || semiOrder.description), dataExportText_(semiLot), dataExportText_(semiOrder.production_order_code), item.received_bag_count ?? '', item.remaining_quantity ?? '', dataExportText_(item.unit), dataExportText_(item.remaining_reason), sum(processing, 'pending_quantity'), '', dataExportText_(join(processing, 'pending_reason')), dataExportText_(join(processing, 'processing_plan')), sum(cancellation, 'cancellation_quantity'), '', dataExportText_(join(cancellation, 'cancellation_reason')), dataExportUser_(item.createdBy)];
}
