const SEMI_FINISHED_EXPORT = { sheetName: 'DANH MỤC BÁN THÀNH PHẨM', headerRows: 2, columns: 29 };

function syncSemiFinishedProductSummaries() {
  const rows = fetchAllDataExportPages_('semi-finished-product-summaries').map(mapSemiFinishedSummaryToRow_);
  const sheet = getDataExportSheet_(SEMI_FINISHED_EXPORT.sheetName);
  const startRow = SEMI_FINISHED_EXPORT.headerRows + 1;
  clearDataExportRows_(sheet, startRow, SEMI_FINISHED_EXPORT.columns);
  if (!rows.length) return;
  ensureDataExportRows_(sheet, startRow + rows.length - 1);
  sheet.getRange(startRow, 5, rows.length, 1).setNumberFormat('@');
  sheet.getRange(startRow, 1, rows.length, SEMI_FINISHED_EXPORT.columns).setValues(rows);
}

function mapSemiFinishedSummaryToRow_(summary) {
  const order = summary.productionOrder || {}, item = order.item || {};
  const documentControl = order.documentControl || {}, registration = order.registrationNumber || item.registration || {};
  const request = (order.samplingRequests || [])[0] || {};
  const quantity = function(value, unit) { return value === null || value === undefined || value === '' ? '' : dataExportText_(value + (unit ? ' ' + unit : '')); };
  return [dataExportDateTime_(summary.created_at), dataExportJoin_([item.item_code || order.item_code, order.lot_no]), dataExportText_(item.item_code || order.item_code), dataExportText_(item.item_name), dataExportText_(order.lot_no), quantity(order.planned_quatity, order.unit), dataExportDate_(order.date_manufacture), dataExportDate_(order.expire_date), dataExportText_(registration.registration_number), dataExportDateTime_(order.start_date), dataExportJoin_([order.remarks, order.internal_notes]), dataExportText_(order.type), dataExportText_(summary.stage), quantity(summary.input_quantity, summary.input_unit), quantity(summary.packed_quantity, summary.packed_unit), quantity(summary.leftover_quantity, summary.leftover_unit), quantity(summary.waste_quantity, summary.waste_unit), '', dataExportUser_(summary.createdBy), dataExportDateTime_(documentControl.batch_record_issued_at), dataExportDateTime_(documentControl.batch_record_received_at), dataExportDateTime_(documentControl.test_certificate_received_at), dataExportDateTime_(request.sent_at), dataExportText_(order.production_order_code), dataExportText_(order.deviation_contents), dataExportText_(order.change_content), '', order.total_sampling_quantity ?? '', dataExportDateTime_(order.first_hygiene_check_at)];
}
