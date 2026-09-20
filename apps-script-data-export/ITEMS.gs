const ITEMS_EXPORT = { sheetName: 'DANH MỤC HÀNG HOÁ', headerRows: 1, columns: 5 };

function syncDanhMucHangHoa() {
  const sheet = getDataExportSheet_(ITEMS_EXPORT.sheetName);
  const items = fetchAllDataExportPages_('items');
  const rows = items.map(function(item) {
    return [dataExportText_(item.item_code), dataExportText_(item.item_name), dataExportText_(item.unit),
      dataExportText_(item.dk_cod || item.dk_code), dataExportText_(item.registration && item.registration.registration_number)];
  });
  sheet.getRange(1, 1, 1, ITEMS_EXPORT.columns).setValues([['Mã hàng', 'Tên hàng', 'Đơn vị tính', 'Mã ĐK', 'Số đăng ký']]);
  clearDataExportRows_(sheet, 2, ITEMS_EXPORT.columns);
  if (!rows.length) return;
  ensureDataExportRows_(sheet, rows.length + 1);
  sheet.getRange(2, 1, rows.length, ITEMS_EXPORT.columns).setNumberFormat('@').setValues(rows);
}
