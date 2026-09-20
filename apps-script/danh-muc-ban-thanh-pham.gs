/**
 * Đồng bộ tab "DANH MỤC BÁN THÀNH PHẨM" từ API HRM.
 *
 * Thiết lập một lần trong Project Settings > Script properties:
 *   DATA_EXPORT_API_KEY      API key của data-export
 *   DATA_EXPORT_BASE_URL     Ví dụ: https://hrmserver.dkpharma.io.vn
 *
 * Nếu script được gắn trực tiếp vào Google Sheet hiện tại, có thể bỏ trống
 * DATA_EXPORT_SPREADSHEET_ID. Nếu là standalone script, đặt property này bằng
 * ID của file Google Sheet.
 */
const BTP_EXPORT_CONFIG = Object.freeze({
  spreadsheetId: '15cMZrG26DHiyyNthp03rxrCcBpbIF2W_eSNDWBLLnvY',
  sheetName: 'DANH MỤC BÁN THÀNH PHẨM',
  headerRows: 2,
  columnCount: 29, // A:AC
  endpoint: '/data-export/semi-finished-product-summaries',
  pageSize: 5000,
  writeBatchSize: 500,
  timeZone: 'Asia/Ho_Chi_Minh',
  apiBaseUrlProperty: 'DATA_EXPORT_BASE_URL',
  apiKeyProperty: 'DATA_EXPORT_API_KEY',
  spreadsheetIdProperty: 'DATA_EXPORT_SPREADSHEET_ID',
});

/** Chạy hàm này để đồng bộ dữ liệu. */
function syncDanhMucBanThanhPham() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10_000)) {
    throw new Error('Đang có một tiến trình đồng bộ khác. Hãy thử lại sau.');
  }

  try {
    const config = btpGetRuntimeConfig_();
    const sheet = btpGetSheet_(config.spreadsheetId);
    const records = btpFetchAll_(config);
    const rows = records.map(btpMapRecordToRow_);

    btpReplaceSheetData_(sheet, rows);
    SpreadsheetApp.flush();

    const message = `Đã đồng bộ ${rows.length} dòng bán thành phẩm.`;
    console.log(message);

    // Chỉ hiện toast khi script chạy trong một spreadsheet đang mở.
    try {
      SpreadsheetApp.getActive().toast(message, 'Data export');
    } catch (_) {
      // Standalone script hoặc trigger không có giao diện để hiển thị toast.
    }
  } finally {
    lock.releaseLock();
  }
}

function btpGetRuntimeConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty(BTP_EXPORT_CONFIG.apiKeyProperty);
  const apiBaseUrl = properties
    .getProperty(BTP_EXPORT_CONFIG.apiBaseUrlProperty)
    ?.trim()
    .replace(/\/$/, '');
  const spreadsheetId =
    properties.getProperty(BTP_EXPORT_CONFIG.spreadsheetIdProperty)?.trim() ||
    BTP_EXPORT_CONFIG.spreadsheetId;

  if (!apiKey) {
    throw new Error(
      `Chưa cấu hình Script property ${BTP_EXPORT_CONFIG.apiKeyProperty}.`,
    );
  }

  if (!apiBaseUrl) {
    throw new Error(
      `Chưa cấu hình Script property ${BTP_EXPORT_CONFIG.apiBaseUrlProperty}.`,
    );
  }

  return { apiKey, apiBaseUrl, spreadsheetId };
}

function btpGetSheet_(spreadsheetId) {
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      'Không xác định được file Google Sheet. Hãy cấu hình DATA_EXPORT_SPREADSHEET_ID.',
    );
  }

  const sheet = spreadsheet.getSheetByName(BTP_EXPORT_CONFIG.sheetName);

  if (!sheet) {
    throw new Error(`Không tìm thấy tab "${BTP_EXPORT_CONFIG.sheetName}".`);
  }

  return sheet;
}

function btpFetchAll_(config) {
  const records = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url =
      config.apiBaseUrl +
      BTP_EXPORT_CONFIG.endpoint +
      `?page=${page}&limit=${BTP_EXPORT_CONFIG.pageSize}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Accept: 'application/json',
        'x-data-export-api-key': config.apiKey,
      },
      muteHttpExceptions: true,
    });
    const status = response.getResponseCode();
    const body = response.getContentText();

    if (status < 200 || status >= 300) {
      throw new Error(`Data export API lỗi ${status}: ${body}`);
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      throw new Error(`Data export API trả về JSON không hợp lệ: ${error}`);
    }

    if (!Array.isArray(payload.data)) {
      throw new Error('Data export API không trả về mảng tại trường data.');
    }

    records.push(...payload.data);
    hasNextPage = payload.pagination?.has_next_page === true;
    page += 1;
  }

  return records;
}

/** Mapping cột A:AC theo hai hàng tiêu đề của tab bán thành phẩm. */
function btpMapRecordToRow_(summary) {
  const order = summary.productionOrder || {};
  const item = order.item || {};
  const registration = order.registrationNumber || {};
  const documentControl = order.documentControl || {};
  const latestSamplingRequest = btpLatestSamplingRequest_(order.samplingRequests);

  const itemCode = item.item_code || order.item_code || '';
  const lotNo = order.lot_no || '';

  return [
    btpFormatDateTime_(summary.created_at), // A: Ngày nhập BTP
    btpJoin_([itemCode, lotNo], ' - '), // B: Mã hàng và số lô BTP
    btpText_(itemCode), // C: Mã BTP
    btpText_(item.item_name || order.description), // D: Tên BTP
    btpText_(lotNo), // E: Số lô BTP
    btpFormatQuantity_(order.planned_quatity, order.unit), // F: Cỡ lô BTP
    btpFormatDate_(order.date_manufacture), // G: NSX
    btpFormatDate_(order.expire_date), // H: HSD
    btpText_(registration.registration_number), // I: Số đăng ký đã lưu
    btpFormatDateTime_(order.start_date), // J: Ngày bắt đầu sản xuất
    btpJoin_([order.remarks, order.internal_notes], ' - '), // K: Ghi chú
    btpText_(order.type), // L: Phân loại sản phẩm
    btpText_(summary.stage), // M: Giai đoạn
    btpFormatQuantity_(summary.input_quantity, summary.input_unit), // N: Đầu vào
    btpFormatQuantity_(summary.packed_quantity, summary.packed_unit), // O: Đã đóng
    btpFormatQuantity_(summary.leftover_quantity, summary.leftover_unit), // P: Còn lại
    btpFormatQuantity_(summary.waste_quantity, summary.waste_unit), // Q: Hao hụt
    '', // R: API hiện chưa có dữ liệu số lỗi/số sót
    btpDisplayUser_(summary.createdBy), // S: Người nhập
    btpFormatDateTime_(documentControl.batch_record_issued_at), // T: Đã cấp HSL lô giấy
    btpFormatDateTime_(documentControl.batch_record_received_at), // U: Đã nhận HSL lô giấy
    btpFormatDateTime_(documentControl.test_certificate_received_at), // V: Đã nhận PKN BTP
    btpFormatDateTime_(latestSamplingRequest.sent_at), // W: Gửi PYC lấy mẫu BTP
    btpText_(order.production_order_code), // X: Mã lệnh sản xuất
    btpText_(order.deviation_contents), // Y: Sai lệch
    btpText_(order.change_content), // Z: Thay đổi
    '', // AA: API hiện chưa có trường phiên bản sổ BM pha chế
    btpNumber_(order.total_sampling_quantity), // AB: Tổng số lượng lấy mẫu
    btpFormatDateTime_(order.first_hygiene_check_at), // AC: Ngày kiểm tra vệ sinh đầu tiên
  ];
}

function btpLatestSamplingRequest_(requests) {
  if (!Array.isArray(requests) || requests.length === 0) return {};

  return requests.reduce((latest, request) => {
    if (!latest?.sent_at) return request;
    if (!request?.sent_at) return latest;

    return new Date(request.sent_at).getTime() > new Date(latest.sent_at).getTime()
      ? request
      : latest;
  }, {});
}

function btpReplaceSheetData_(sheet, rows) {
  const firstDataRow = BTP_EXPORT_CONFIG.headerRows + 1;
  const oldDataRows = Math.max(sheet.getLastRow() - BTP_EXPORT_CONFIG.headerRows, 0);

  // Chỉ xóa nội dung cũ; giữ nguyên hàng tiêu đề, định dạng và validation.
  if (oldDataRows > 0) {
    sheet
      .getRange(firstDataRow, 1, oldDataRows, BTP_EXPORT_CONFIG.columnCount)
      .clearContent();
  }

  if (rows.length === 0) return;

  btpEnsureRows_(sheet, firstDataRow + rows.length - 1);

  // Các mã và số lô là text để không mất số 0 đầu.
  btpSetTextColumns_(sheet, firstDataRow, rows.length);

  for (let start = 0; start < rows.length; start += BTP_EXPORT_CONFIG.writeBatchSize) {
    const batch = rows.slice(start, start + BTP_EXPORT_CONFIG.writeBatchSize);
    sheet
      .getRange(firstDataRow + start, 1, batch.length, BTP_EXPORT_CONFIG.columnCount)
      .setValues(batch);
  }
}

function btpSetTextColumns_(sheet, firstDataRow, rowCount) {
  // B, C, E, I và X chứa mã/số lô/số đăng ký.
  [2, 3, 5, 9, 24].forEach((column) => {
    sheet.getRange(firstDataRow, column, rowCount, 1).setNumberFormat('@');
  });
}

function btpEnsureRows_(sheet, requiredLastRow) {
  const missingRows = requiredLastRow - sheet.getMaxRows();

  if (missingRows > 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), missingRows);
  }
}

function btpFormatDate_(value) {
  if (!value) return '';

  // Chuỗi YYYY-MM-DD phải được giữ theo ngày gốc, không quy đổi múi giờ.
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? btpText_(value)
    : Utilities.formatDate(date, BTP_EXPORT_CONFIG.timeZone, 'dd/MM/yyyy');
}

function btpFormatDateTime_(value) {
  if (!value) return '';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? btpText_(value)
    : Utilities.formatDate(date, BTP_EXPORT_CONFIG.timeZone, 'dd/MM/yyyy HH:mm');
}

function btpFormatQuantity_(quantity, unit) {
  if (quantity === null || quantity === undefined || quantity === '') return '';

  return btpText_(`${quantity}${unit ? ` ${unit}` : ''}`);
}

function btpNumber_(value) {
  if (value === null || value === undefined || value === '') return '';

  const number = Number(value);
  return Number.isFinite(number) ? number : '';
}

function btpJoin_(values, separator) {
  return values
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .map(btpText_)
    .join(separator);
}

function btpDisplayUser_(user) {
  return btpText_(user?.name || user?.username || user?.email || '');
}

// Ngăn dữ liệu API bắt đầu bằng =, +, - hoặc @ bị Sheets đánh giá là công thức.
function btpText_(value) {
  if (value === null || value === undefined) return '';

  const text = String(value).trim();
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
}
