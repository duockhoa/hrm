const ITEM_EXPORT_SHEET_NAME = "DANH MỤC HÀNG HOÁ";

function syncDanhMucHangHoa() {
  const spreadsheet = SpreadsheetApp.openById(DATA_EXPORT_ENV.spreadsheetId);

  const sheet = spreadsheet.getSheetByName(ITEM_EXPORT_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Không tìm thấy sheet: ${ITEM_EXPORT_SHEET_NAME}`);
  }

  const items = getAllItems_();

  // Bảo đảm sheet đủ số dòng để ghi toàn bộ dữ liệu.
  const requiredRows = items.length + 1; // + 1 dòng tiêu đề
  if (sheet.getMaxRows() < requiredRows) {
    sheet.insertRowsAfter(
      sheet.getMaxRows(),
      requiredRows - sheet.getMaxRows(),
    );
  }

  const headers = [
    ["Mã hàng", "Tên hàng", "Đơn vị tính", "Mã ĐK", "Số đăng ký"],
  ];
  sheet.getRange(1, 1, 1, 5).setValues(headers);

  // Xóa dữ liệu cũ, giữ nguyên định dạng của sheet.
  const dataRowCount = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 1, dataRowCount, 5).clearContent();

  const values = items.map((item) => [
    safeText_(item.item_code),
    safeText_(item.item_name),
    safeText_(item.unit),
    // Mã ĐK lấy từ dk_cod theo yêu cầu; fallback cho API hiện tại dùng dk_code.
    safeText_(item.dk_cod ?? item.dk_code),
    safeText_(item.registration?.registration_number),
  ]);

  if (values.length > 0) {
    const target = sheet.getRange(2, 1, values.length, 5);
    target.setNumberFormat("@"); // Giữ mã hàng/mã ĐK ở dạng text, không mất số 0 đầu.
    target.setValues(values);
  }
}

function getAllItems_() {
  const allItems = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url =
      `${DATA_EXPORT_ENV.apiBaseUrl}/items` +
      `?page=${page}&limit=${DATA_EXPORT_ENV.pageSize}`;

    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "x-data-export-api-key": DATA_EXPORT_ENV.apiKey,
      },
      muteHttpExceptions: true,
    });

    const status = response.getResponseCode();
    const body = response.getContentText();

    if (status < 200 || status >= 300) {
      throw new Error(`API lỗi ${status}: ${body}`);
    }

    const result = JSON.parse(body);
    allItems.push(...(result.data || []));
    hasNextPage = result.pagination?.has_next_page === true;
    page++;
  }

  return allItems;
}

// Ngăn dữ liệu bắt đầu bằng =, +, -, @ bị Google Sheets hiểu là công thức.
function safeText_(value) {
  if (value === null || value === undefined) return "";

  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
