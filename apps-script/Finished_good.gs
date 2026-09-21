const FINISHED_GOOD_EXPORT = { sheetName: 'DANH MỤC THÀNH PHẨM', headerRows: 1, columns: 30 };

function xuatThanhPham() {
  const rows = fetchAllDataExportPages_('finished-product-summaries').map(mapFinishedGoodRow_);
  const sheet = getDataExportSheet_(FINISHED_GOOD_EXPORT.sheetName);
  clearDataExportRows_(sheet, 2, FINISHED_GOOD_EXPORT.columns);
  if (!rows.length) return;
  ensureDataExportRows_(sheet, rows.length + 1);
  sheet.getRange(2, 5, rows.length, 1).setNumberFormat('@');
  sheet.getRange(2, 1, rows.length, FINISHED_GOOD_EXPORT.columns).setValues(rows);
}

function mapFinishedGoodRow_(item) {
  const po = item.productionOrder || {}, product = po.item || {}, registration = product.registration || {};
  const documentControl = po.documentControl || {}, line = (product.productionSpecification || {}).productLine || {};
  const code = product.item_code || po.item_code || '', lot = po.lot_no || '';
  const quantity = !item.package_count && !item.boxes_per_package && !item.loose_box_count ? '' :
    Number(item.package_count || 0) * Number(item.boxes_per_package || 0) + Number(item.loose_box_count || 0);
  const samples = Array.isArray(po.samplingRecords) && po.samplingRecords.length ? po.samplingRecords.reduce(function(sum, row) { return sum + (Number(row.quantity) || 0); }, 0) : '';
  const deviations = (po.deviations || []).map(function(row) { return row.deviation_content; }).filter(Boolean).join(', ');
  return [dataExportDateTime_(item.created_at), dataExportJoin_([code, lot], '-'), dataExportText_(code), dataExportText_(product.item_name || po.description), dataExportText_(lot), po.planned_quatity ?? '', dataExportText_(product.unit || po.unit), dataExportDate_(po.date_manufacture), dataExportDate_(po.expire_date), dataExportText_(registration.registration_number), dataExportDate_(po.start_date), dataExportText_(po.remarks), dataExportText_(line.name || line.code), quantity, dataExportText_(product.unit || po.unit), item.package_count ?? '', item.boxes_per_package ?? '', item.loose_box_count ?? '', dataExportUser_(item.createdBy), dataExportDateTime_(documentControl.batch_record_issued_at), dataExportDateTime_(documentControl.batch_record_received_at), dataExportDateTime_(documentControl.test_certificate_received_at), dataExportDateTime_((po.samplingRequests || [])[0] && po.samplingRequests[0].sent_at), dataExportText_(po.production_order_code), dataExportText_(deviations), dataExportText_(po.change_content), dataExportDateTime_((po.productionGuide || {}).created_at), samples, dataExportDateTime_((po.lineClearanceChecks || [])[0] && po.lineClearanceChecks[0].created_at), dataExportDateTime_((po.factoryReleaseReviews || [])[0] && po.factoryReleaseReviews[0].created_at)];
}
