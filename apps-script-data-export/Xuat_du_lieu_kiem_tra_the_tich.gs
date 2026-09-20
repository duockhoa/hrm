const VOLUME_CHECK_EXPORT = { sheetName: 'KIỂM TRA THỂ TÍCH', headerRows: 2, columns: 12 };

function xuatKiemTraTheTich() {
  const rows = fetchAllDataExportPages_('volume-checks').map(mapVolumeCheckRow_);
  const sheet = getDataExportSheet_(VOLUME_CHECK_EXPORT.sheetName);
  const startRow = VOLUME_CHECK_EXPORT.headerRows + 1;
  clearDataExportRows_(sheet, startRow, VOLUME_CHECK_EXPORT.columns);
  if (!rows.length) return;
  ensureDataExportRows_(sheet, startRow + rows.length - 1);
  sheet.getRange(startRow, 4, rows.length, 1).setNumberFormat('@');
  sheet.getRange(startRow, 6, rows.length, 6).setNumberFormat('0.###');
  sheet.getRange(startRow, 1, rows.length, VOLUME_CHECK_EXPORT.columns).setValues(rows);
}

function mapVolumeCheckRow_(item) {
  const order = item.productionOrder || {}, product = order.item || {};
  const code = product.item_code || order.item_code || '', lot = order.lot_no || '';
  return [dataExportDateTime_(item.created_at), dataExportJoin_([code, lot], '-'), dataExportText_(product.item_name || order.description), dataExportText_(lot), dataExportText_(item.dosage_form_stage), dataExportNumber_(item.unit_1_volume), dataExportNumber_(item.unit_2_volume), dataExportNumber_(item.unit_3_volume), dataExportNumber_(item.unit_4_volume), dataExportNumber_(item.unit_5_volume), dataExportNumber_(item.unit_6_volume), dataExportUser_(item.createdBy)];
}
