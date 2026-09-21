const WEIGHT_CHECKS_SHEET_NAME = "KIỂM TRA KHỐI LƯỢNG";

function xuatKiemTraKhoiLuong() {
  const apiUrl =
    `${DATA_EXPORT_ENV.apiBaseUrl}/semi-finished-weight-checks` +
    `?limit=${DATA_EXPORT_ENV.pageSize}&page=1`;

  const response = UrlFetchApp.fetch(apiUrl, {
    method: "get",
    headers: {
      "x-data-export-api-key": DATA_EXPORT_ENV.apiKey,
      Accept: "application/json",
    },
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const body = response.getContentText();
  if (status !== 200) {
    throw new Error(`Lỗi API ${status}: ${body}`);
  }

  const data = JSON.parse(body).data;
  if (!Array.isArray(data)) {
    throw new Error("API không trả về dữ liệu dạng mảng tại json.data.");
  }

  const sheet = SpreadsheetApp.openById(
    DATA_EXPORT_ENV.spreadsheetId,
  ).getSheetByName(WEIGHT_CHECKS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy tab ${WEIGHT_CHECKS_SHEET_NAME}.`);
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

  // Ép giá trị API thành số thực cho Google Sheets.
  const asNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";

    const numberValue = Number(String(value).replace(",", "."));
    return Number.isFinite(numberValue) ? numberValue : "";
  };

  const output = data.map((item) => {
    const productionOrder = item.productionOrder || {};
    const hangHoa = productionOrder.item || {};
    const maHang = hangHoa.item_code || productionOrder.item_code || "";
    const soLo = productionOrder.lot_no || "";

    return [
      formatDateTime(item.created_at), // A: Thời điểm
      item.check_type || "", // B: net hoặc gross
      item.dosage_form_stage || "", // C: Dạng bào chế
      [maHang, soLo].filter(Boolean).join("-"), // D: Sản phẩm
      hangHoa.item_name || productionOrder.description || "", // E: Tên BTP
      asLotText(soLo), // F: Số lô BTP
      asNumber(item.unit_1_weight), // G: Đơn vị 1
      asNumber(item.unit_2_weight), // H: Đơn vị 2
      asNumber(item.unit_3_weight), // I: Đơn vị 3
      asNumber(item.unit_4_weight), // J: Đơn vị 4
      asNumber(item.unit_5_weight), // K: Đơn vị 5
      asNumber(item.unit_6_weight), // L: Đơn vị 6
      asNumber(item.unit_7_weight), // M: Đơn vị 7
      asNumber(item.unit_8_weight), // N: Đơn vị 8
      asNumber(item.unit_9_weight), // O: Đơn vị 9
      asNumber(item.unit_10_weight), // P: Đơn vị 10
      item.createdBy?.name || item.createdBy?.username || "", // Q: Người nhập
    ];
  });

  // Header ở dòng 1, mô tả ở dòng 2; dữ liệu từ dòng 2.
  const startRow = 2;
  const oldRowCount = sheet.getLastRow() - startRow + 1;
  if (oldRowCount > 0) {
    sheet.getRange(startRow, 1, oldRowCount, 17).clearContent();
  }

  if (output.length > 0) {
    sheet.getRange(startRow, 1, output.length, 17).setValues(output);

    // F là số lô dạng text; G:P là 10 cột số.
    sheet.getRange(startRow, 6, output.length, 1).setNumberFormat("@");
    sheet.getRange(startRow, 7, output.length, 10).setNumberFormat("0.###");
  }
}
