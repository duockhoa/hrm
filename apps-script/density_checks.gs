const DENSITY_CHECKS_SHEET_NAME = "TỈ TRỌNG";

function xuatTiTrong() {
  const sheet = SpreadsheetApp.openById(
    DATA_EXPORT_ENV.spreadsheetId,
  ).getSheetByName(DENSITY_CHECKS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy tab ${DENSITY_CHECKS_SHEET_NAME}.`);
  }

  // API giới hạn tối đa 10.000 bản ghi/trang, kể cả khi cấu hình dùng số lớn hơn.
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

  const asNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const numberValue = Number(String(value).replace(",", "."));
    return Number.isFinite(numberValue) ? numberValue : "";
  };

  do {
    const apiUrl =
      `${DATA_EXPORT_ENV.apiBaseUrl}/density-checks` +
      `?limit=${pageSize}&page=${page}`;
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

    json.data.forEach((item) => {
      const productionOrder = item.productionOrder || {};
      const hangHoa = productionOrder.item || {};
      const maHang = hangHoa.item_code || productionOrder.item_code || "";
      const soLo = productionOrder.lot_no ?? "";

      output.push([
        formatDateTime(item.created_at), // A: Thời điểm
        [maHang, soLo].filter(Boolean).join("-"), // B: Mã BTP-số lô
        hangHoa.item_name || productionOrder.description || "", // C: Tên BTP
        soLo === "" ? "" : "'" + String(soLo), // D: Số lô BTP, giữ số 0 đầu
        asNumber(item.empty_pycnometer_mass_g), // E: Bình rỗng (g)
        asNumber(item.solution_pycnometer_mass_g), // F: Bình chứa dịch (g)
        asNumber(item.water_pycnometer_mass_g), // G: Bình chứa nước (g)
        asNumber(item.density), // H: Tỉ trọng
        asNumber(item.apparent_density), // I: Tỉ trọng biểu kiến, để trống nếu chưa nhập
        item.createdBy?.name || item.createdBy?.username || "", // J: Người nhập
      ]);
    });
    hasNextPage = json.pagination.has_next_page;
    page += 1;
  } while (hasNextPage);

  // Chỉ thay dữ liệu sau khi đã tải thành công tất cả các trang; giữ header dòng 1.
  const startRow = 2;
  const requiredRows = output.length + startRow - 1;
  if (requiredRows > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  }
  const oldRowCount = sheet.getLastRow() - startRow + 1;
  if (oldRowCount > 0) {
    sheet.getRange(startRow, 1, oldRowCount, 10).clearContent();
  }
  if (output.length > 0) {
    sheet.getRange(startRow, 4, output.length, 1).setNumberFormat("@");
    sheet.getRange(startRow, 1, output.length, 10).setValues(output);
    sheet.getRange(startRow, 5, output.length, 3).setNumberFormat("0.####");
    sheet.getRange(startRow, 8, output.length, 2).setNumberFormat("0.######");
  }
}
