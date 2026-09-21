const VOLUME_CHECKS_SHEET_NAME = "KIỂM TRA THỂ TÍCH";

function xuatKiemTraTheTich() {
  const apiUrl =
    `${DATA_EXPORT_ENV.apiBaseUrl}/volume-checks` +
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
  ).getSheetByName(VOLUME_CHECKS_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Không tìm thấy tab ${VOLUME_CHECKS_SHEET_NAME}.`);
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

  // Ép dữ liệu API thành số thực.
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
      [maHang, soLo].filter(Boolean).join("-"), // B: Sản phẩm
      hangHoa.item_name || productionOrder.description || "", // C: Tên BTP
      asLotText(soLo), // D: Số lô BTP
      item.dosage_form_stage || "", // E: Dạng bào chế
      asNumber(item.unit_1_volume), // F: Đơn vị 1
      asNumber(item.unit_2_volume), // G: Đơn vị 2
      asNumber(item.unit_3_volume), // H: Đơn vị 3
      asNumber(item.unit_4_volume), // I: Đơn vị 4
      asNumber(item.unit_5_volume), // J: Đơn vị 5
      asNumber(item.unit_6_volume), // K: Đơn vị 6
      item.createdBy?.name || item.createdBy?.username || "", // L: Người nhập
    ];
  });

  // Dòng 1 là header, dòng 2 là diễn giải; dữ liệu bắt đầu từ dòng 3.
  const startRow = 2;
  const oldRowCount = sheet.getLastRow() - startRow + 1;

  if (oldRowCount > 0) {
    sheet.getRange(startRow, 1, oldRowCount, 12).clearContent();
  }

  if (output.length > 0) {
    sheet.getRange(startRow, 1, output.length, 12).setValues(output);

    // D là text giữ số 0 đầu số lô; F:K là sáu cột số.
    sheet.getRange(startRow, 4, output.length, 1).setNumberFormat("@");
    sheet.getRange(startRow, 6, output.length, 6).setNumberFormat("0.###");
  }
}
