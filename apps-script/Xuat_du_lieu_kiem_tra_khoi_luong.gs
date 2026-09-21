const WEIGHT_CHECK_EXPORT = { sheetName: 'KIỂM TRA KHỐI LƯỢNG', headerRows: 2, columns: 17 };

function xuatKiemTraKhoiLuong() {
  const rows = fetchAllDataExportPages_('semi-finished-weight-checks').map(mapWeightCheckRow_);
  const sheet = getDataExportSheet_(WEIGHT_CHECK_EXPORT.sheetName);
  const startRow = WEIGHT_CHECK_EXPORT.headerRows + 1;
  clearDataExportRows_(sheet, startRow, WEIGHT_CHECK_EXPORT.columns);
  if (!rows.length) return;
  ensureDataExportRows_(sheet, startRow + rows.length - 1);
  sheet.getRange(startRow, 6, rows.length, 1).setNumberFormat('@');
  sheet.getRange(startRow, 7, rows.length, 10).setNumberFormat('0.###');
  sheet.getRange(startRow, 1, rows.length, WEIGHT_CHECK_EXPORT.columns).setValues(rows);
}

function mapWeightCheckRow_(item) {
  const order = item.productionOrder || {}, product = order.item || {};
  const code = product.item_code || order.item_code || '', lot = order.lot_no || '';
  const weights = [];
  for (let number = 1; number <= 10; number += 1) weights.push(dataExportNumber_(item['unit_' + number + '_weight']));
  return [dataExportDateTime_(item.created_at), dataExportText_(item.check_type), dataExportText_(item.dosage_form_stage), dataExportJoin_([code, lot], '-'), dataExportText_(product.item_name || order.description), dataExportText_(lot)].concat(weights, [dataExportUser_(item.createdBy)]);
}
