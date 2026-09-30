const PRODUCTION_ORDER_DEVIATIONS_SHEET_NAME = "SAI LỆCH";

function xuatSaiLechSanXuat() {
  const pageSize = Math.min(Number(DATA_EXPORT_ENV.pageSize) || 500, 10000);
  const data = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const apiUrl =
      `${DATA_EXPORT_ENV.apiBaseUrl}/production-order-deviations` +
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

    const result = JSON.parse(body);
    if (!Array.isArray(result.data)) {
      throw new Error("API không trả về mảng dữ liệu tại json.data.");
    }

    data.push(...result.data);
    hasNextPage = Boolean(result.pagination?.has_next_page);
    page += 1;
  }

  const sheet = SpreadsheetApp.openById(
    DATA_EXPORT_ENV.spreadsheetId,
  ).getSheetByName(PRODUCTION_ORDER_DEVIATIONS_SHEET_NAME);

  if (!sheet) {
    throw new Error(
      `Không tìm thấy tab ${PRODUCTION_ORDER_DEVIATIONS_SHEET_NAME}.`,
    );
  }

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return isNaN(date.getTime())
      ? value
      : Utilities.formatDate(date, DATA_EXPORT_ENV.timeZone, "dd/MM/yyyy");
  };

  const output = data.map((deviation) => [
    formatDate(deviation.created_at), // A: Ngày nhập sai lệch
    deviation.deviation_content || "", // B: Nội dung sai lệch
    deviation.product_name || "", // C: Tên sản phẩm
    deviation.product_code || "", // D: Mã sản phẩm
    deviation.lot_no || "", // E: Số lô
    deviation.product_code_lot ||
      [deviation.product_code, deviation.lot_no].filter(Boolean).join("-"), // F: Mã sản phẩm-số lô
    deviation.handling_plan || "", // G: Phương án xử lý sai lệch
    deviation.handling_result || "", // H: Kết quả xử lý sai lệch
    deviation.cause || "", // I: Nguyên nhân sai lệch
    deviation.reporter_name || "", // J: Người nhập sai lệch
  ]);

  // Giữ hai dòng tiêu đề/mô tả; dữ liệu bắt đầu từ dòng 3.
  const startRow = 3;
  const oldRowCount = sheet.getLastRow() - startRow + 1;
  if (oldRowCount > 0) {
    sheet.getRange(startRow, 1, oldRowCount, 10).clearContent();
  }

  if (output.length > 0) {
    sheet.getRange(startRow, 1, output.length, 10).setValues(output);
  }
}
