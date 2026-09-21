const POST_SECONDARY_PACKAGING_SUMMARIES_SHEET_NAME =
  "TỔNG KẾT BTP HOÀN THIỆN";

function xuatTongKetBtpHoanThien() {
  const apiUrl =
    `${DATA_EXPORT_ENV.apiBaseUrl}/post-secondary-packaging-summaries` +
    `?limit=${DATA_EXPORT_ENV.pageSize}&page=1`;

  const response = UrlFetchApp.fetch(apiUrl, {
    method: "get",
    headers: {
      "x-data-export-api-key": DATA_EXPORT_ENV.apiKey,
      Accept: "application/json",
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(
      `Lỗi API ${response.getResponseCode()}: ${response.getContentText()}`,
    );
  }

  const data = JSON.parse(response.getContentText()).data;

  if (!Array.isArray(data)) {
    throw new Error("API không trả về dữ liệu dạng mảng tại json.data.");
  }

  const sheet = SpreadsheetApp.openById(
    DATA_EXPORT_ENV.spreadsheetId,
  ).getSheetByName(POST_SECONDARY_PACKAGING_SUMMARIES_SHEET_NAME);

  if (!sheet) {
    throw new Error(
      `Không tìm thấy tab ${POST_SECONDARY_PACKAGING_SUMMARIES_SHEET_NAME}.`,
    );
  }

  const formatDateTime = (value) => {
    if (!value) return "";

    const date = new Date(value);
    return isNaN(date.getTime())
      ? value
      : Utilities.formatDate(
          date,
          DATA_EXPORT_ENV.timeZone,
          "dd/MM/yyyy HH:mm",
        );
  };

  const asLotText = (value) => {
    if (value === null || value === undefined || value === "") return "";
    return "'" + String(value);
  };

  const sumQuantity = (records, fieldName) => {
    if (!Array.isArray(records) || records.length === 0) return "";

    return records.reduce(
      (total, record) => total + (Number(record[fieldName]) || 0),
      0,
    );
  };

  const joinField = (records, fieldName) => {
    if (!Array.isArray(records)) return "";

    return records
      .map((record) => record[fieldName])
      .filter(Boolean)
      .join(", ");
  };

  const output = data.map((item) => {
    const productionOrder = item.productionOrder || {};
    const thanhPham = productionOrder.item || {};

    const semiFinishedOrder = item.semiFinishedProductOrder || {};
    const banThanhPham = semiFinishedOrder.item || {};

    const pendingProcessItems = item.pendingProcessItems || [];
    const pendingCancellationItems = item.pendingCancellationItems || [];

    const maThanhPham = thanhPham.item_code || productionOrder.item_code || "";
    const lotNoThanhPham = productionOrder.lot_no || "";

    const maBanThanhPham =
      banThanhPham.item_code || semiFinishedOrder.item_code || "";
    const lotNoBanThanhPham = semiFinishedOrder.lot_no || "";

    return [
      formatDateTime(item.created_at), // A: Thời điểm
      [maThanhPham, lotNoThanhPham].filter(Boolean).join("-"), // B: Mã TP - Số lô
      maThanhPham, // C: Mã thành phẩm
      thanhPham.item_name || productionOrder.description || "", // D: Tên thành phẩm
      asLotText(lotNoThanhPham), // E: Số lô TP
      maBanThanhPham, // F: Mã BTP
      banThanhPham.item_name || semiFinishedOrder.description || "", // G: Tên BTP
      asLotText(lotNoBanThanhPham), // H: Số lô BTP
      semiFinishedOrder.production_order_code || "", // I: Mã lệnh BTP
      item.received_bag_count ?? "", // J: Số túi nhận
      item.remaining_quantity ?? "", // K: Số lượng tồn
      item.unit || "", // L: Đơn vị số lượng tồn
      item.remaining_reason || "", // M: Lý do tồn
      sumQuantity(pendingProcessItems, "pending_quantity"), // N: Số lượng xử lý
      "", // O: Đơn vị số lượng xử lý
      joinField(pendingProcessItems, "pending_reason"), // P: Lý do chờ xử lý
      joinField(pendingProcessItems, "processing_plan"), // Q: Phương án xử lý
      sumQuantity(pendingCancellationItems, "cancellation_quantity"), // R: Số lượng hủy
      "", // S: Đơn vị số lượng hủy
      joinField(pendingCancellationItems, "cancellation_reason"), // T: Lý do hủy
      item.createdBy?.name || item.createdBy?.username || "", // U: Người tổng kết
    ];
  });

  // Giữ header dòng 1 và mô tả dòng 2; dữ liệu từ dòng 3.
  const startRow = 2;
  const oldRowCount = sheet.getLastRow() - startRow + 1;

  if (oldRowCount > 0) {
    sheet.getRange(startRow, 1, oldRowCount, 21).clearContent();
  }

  if (output.length > 0) {
    // E và H là text để giữ số 0 đầu số lô.
    sheet.getRange(startRow, 5, output.length, 1).setNumberFormat("@");
    sheet.getRange(startRow, 8, output.length, 1).setNumberFormat("@");

    // Ghi dữ liệu từ A đến U.
    sheet.getRange(startRow, 1, output.length, 21).setValues(output);
  }
}
