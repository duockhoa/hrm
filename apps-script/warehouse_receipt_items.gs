const WAREHOUSE_RECEIPT_ITEMS_SHEET_NAME = "Kiểm hàng nhập kho";

function xuatKiemHangNhapKho() {
  const sheet = SpreadsheetApp.openById(
    DATA_EXPORT_ENV.spreadsheetId,
  ).getSheetByName(WAREHOUSE_RECEIPT_ITEMS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy tab ${WAREHOUSE_RECEIPT_ITEMS_SHEET_NAME}.`);
  }

  const pageSize = Math.min(DATA_EXPORT_ENV.pageSize, 10000);
  const output = [];
  let page = 1;
  let hasNextPage;

  const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return isNaN(date.getTime())
      ? value
      : Utilities.formatDate(date, DATA_EXPORT_ENV.timeZone, "dd/MM/yyyy HH:mm");
  };
  const formatDate = (value) => {
    if (!value) return "";
    // expiry_date là ngày lịch, không dịch ngày theo múi giờ.
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : asText(value);
  };
  const asNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(value);
    return Number.isFinite(number) ? number : "";
  };
  const asText = (value) => {
    const text = String(value ?? "");
    return /^[=+\-@]/.test(text) ? "'" + text : text;
  };

  do {
    const url =
      `${DATA_EXPORT_ENV.apiBaseUrl}/warehouse-receipt-items` +
      `?limit=${pageSize}&page=${page}`;
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "x-data-export-api-key": DATA_EXPORT_ENV.apiKey,
        Accept: "application/json",
      },
      muteHttpExceptions: true,
    });
    const status = response.getResponseCode();
    const body = response.getContentText();
    if (status !== 200) throw new Error(`Lỗi API ${status}: ${body}`);

    const json = JSON.parse(body);
    if (
      !Array.isArray(json.data) ||
      typeof json.pagination?.has_next_page !== "boolean"
    ) {
      throw new Error("API không trả về dữ liệu hoặc thông tin phân trang hợp lệ.");
    }
    if (json.pagination.has_next_page && json.data.length === 0) {
      throw new Error("API trả về trang rỗng nhưng vẫn còn trang tiếp theo.");
    }

    json.data.forEach((receipt) => {
      const sap = receipt.sapConfirmation || {};
      output.push([
        formatDateTime(receipt.received_at), // A: Thời điểm nhập kho
        asText(receipt.item_code), // B: Mã hàng
        asText(receipt.item?.item_name), // C: Tên hàng
        receipt.lot_number == null || receipt.lot_number === "" ? "" : "'" + String(receipt.lot_number), // D: Số lô, giữ số 0 đầu
        formatDate(receipt.expiry_date), // E: Hạn dùng
        asNumber(receipt.quantity), // F: Số lượng
        asText(receipt.unit), // G: Đơn vị tính của lần nhập
        asText(receipt.packaging_specification), // H: Quy cách
        asText(receipt.manufacturer?.manufacturer_name || receipt.manufacturer_name), // I: Nhà sản xuất
        asText(receipt.supplier?.card_name || receipt.supplier_name), // J: Nhà cung cấp
        asText(receipt.note), // K: Ghi chú
        formatDateTime(receipt.samplingRequest?.sent_at), // L: Thời điểm gửi PYCLM
        formatDateTime(sap.confirmed_at), // M: Thời điểm xác nhận nhập SAP
        asText(sap.confirmedBy?.name || sap.confirmedBy?.username), // N: Người xác nhận nhập SAP
      ]);
    });
    hasNextPage = json.pagination.has_next_page;
    page += 1;
  } while (hasNextPage);

  // Chỉ thay dữ liệu khi đã tải thành công tất cả các trang; giữ tiêu đề dòng 1.
  const requiredRows = output.length + 1;
  if (requiredRows > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  }
  const oldRowCount = sheet.getLastRow() - 1;
  if (oldRowCount > 0) sheet.getRange(2, 1, oldRowCount, 14).clearContent();
  if (output.length > 0) {
    sheet.getRange(2, 2, output.length, 3).setNumberFormat("@");
    sheet.getRange(2, 1, output.length, 14).setValues(output);
    sheet.getRange(2, 6, output.length, 1).setNumberFormat("0.###");
  }
}
