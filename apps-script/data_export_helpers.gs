/** Hàm dùng chung; không đặt biến môi trường trong file này. */
function getDataExportApiKey_() {
  const key = DATA_EXPORT_ENV.apiKey;
  if (!key || key === 'DAN_API_KEY_VAO_DAY') {
    throw new Error('Chưa có API key. Hãy cập nhật DATA_EXPORT_ENV.apiKey trong file configs.gs.');
  }
  return key;
}

function fetchAllDataExportPages_(endpoint) {
  const data = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const url = DATA_EXPORT_ENV.apiBaseUrl + '/' + endpoint + '?page=' + page + '&limit=' + DATA_EXPORT_ENV.pageSize;
    const response = UrlFetchApp.fetch(url, { method: 'get', headers: { 'x-data-export-api-key': getDataExportApiKey_(), 'Accept': 'application/json' }, muteHttpExceptions: true });
    const status = response.getResponseCode();
    const body = response.getContentText();
    if (status < 200 || status >= 300) throw new Error('API lỗi ' + status + ': ' + body);
    let payload;
    try { payload = JSON.parse(body); } catch (error) { throw new Error('API trả về JSON không hợp lệ: ' + error.message); }
    if (!Array.isArray(payload.data)) throw new Error('API không trả về mảng dữ liệu tại json.data.');
    data.push.apply(data, payload.data);
    hasNextPage = payload.pagination && payload.pagination.has_next_page === true;
    page += 1;
  }
  return data;
}

function getDataExportSheet_(sheetName) {
  const sheet = SpreadsheetApp.openById(DATA_EXPORT_ENV.spreadsheetId).getSheetByName(sheetName);
  if (!sheet) throw new Error('Không tìm thấy tab: ' + sheetName);
  return sheet;
}
function ensureDataExportRows_(sheet, requiredLastRow) { const missingRows = requiredLastRow - sheet.getMaxRows(); if (missingRows > 0) sheet.insertRowsAfter(sheet.getMaxRows(), missingRows); }
function clearDataExportRows_(sheet, startRow, columnCount) { const count = sheet.getLastRow() - startRow + 1; if (count > 0) sheet.getRange(startRow, 1, count, columnCount).clearContent(); }
function dataExportDate_(value) { return dataExportFormatDate_(value, 'dd/MM/yyyy'); }
function dataExportDateTime_(value) { return dataExportFormatDate_(value, 'dd/MM/yyyy HH:mm'); }
function dataExportFormatDate_(value, format) { if (!value) return ''; const date = new Date(value); return isNaN(date.getTime()) ? String(value) : Utilities.formatDate(date, DATA_EXPORT_ENV.timeZone, format); }
function dataExportText_(value) { if (value === null || value === undefined) return ''; const text = String(value); return /^[=+\-@]/.test(text) ? "'" + text : text; }
function dataExportNumber_(value) { if (value === null || value === undefined || value === '') return ''; const result = Number(String(value).replace(',', '.')); return Number.isFinite(result) ? result : ''; }
function dataExportUser_(user) { return user ? dataExportText_(user.name || user.username || user.email || '') : ''; }
function dataExportJoin_(values, separator) { return values.filter(function(v) { return v !== null && v !== undefined && String(v).trim(); }).join(separator || ' - '); }
