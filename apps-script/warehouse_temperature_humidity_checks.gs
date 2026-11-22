const WAREHOUSE_TEMPERATURE_HUMIDITY_SHEET_NAME = "NHIỆT ĐỘ ĐỘ ẨM KHO";

function xuatNhietDoDoAmKho() {
  const sheet = SpreadsheetApp.openById(
    DATA_EXPORT_ENV.spreadsheetId,
  ).getSheetByName(WAREHOUSE_TEMPERATURE_HUMIDITY_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy tab ${WAREHOUSE_TEMPERATURE_HUMIDITY_SHEET_NAME}.`);
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
      `${DATA_EXPORT_ENV.apiBaseUrl}/warehouse-temperature-humidity-checks` +
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

    json.data.forEach((check) => {
      output.push([
        formatDateTime(check.created_at), // A: Thời điểm
        asText(check.location), // B: Vị trí
        asNumber(check.temperature), // C: Nhiệt độ (°C)
        asNumber(check.humidity), // D: Độ ẩm (%RH)
        check.is_passed === true ? "Đạt" : check.is_passed === false ? "Không đạt" : "", // E: Kết quả
        asText(check.checkedBy?.name || check.checkedBy?.username), // F: Người kiểm tra
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
  if (oldRowCount > 0) sheet.getRange(2, 1, oldRowCount, 6).clearContent();
  if (output.length > 0) {
    sheet.getRange(2, 1, output.length, 6).setValues(output);
    sheet.getRange(2, 3, output.length, 2).setNumberFormat("0.##");
  }
}
