const SEMI_FINISHED_PRODUCT_SUMMARIES_SHEET_NAME =
  "DANH MỤC BÁN THÀNH PHẨM";

function xuatTongKetBanThanhPham() {
  const apiUrl =
    `${DATA_EXPORT_ENV.apiBaseUrl}/semi-finished-product-summaries` +
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
    throw new Error("API không trả về mảng dữ liệu tại json.data.");
  }

  const sheet = SpreadsheetApp.openById(
    DATA_EXPORT_ENV.spreadsheetId,
  ).getSheetByName(SEMI_FINISHED_PRODUCT_SUMMARIES_SHEET_NAME);

  if (!sheet) {
    throw new Error(
      `Không tìm thấy tab ${SEMI_FINISHED_PRODUCT_SUMMARIES_SHEET_NAME}.`,
    );
  }

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);
    return isNaN(date.getTime())
      ? value
      : Utilities.formatDate(date, DATA_EXPORT_ENV.timeZone, "dd/MM/yyyy");
  };

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

  const calculateFinishedQuantity = (
    packageCount,
    boxesPerPackage,
    looseBoxCount,
  ) => {
    if (!packageCount && !boxesPerPackage && !looseBoxCount) return "";

    return (
      Number(packageCount || 0) * Number(boxesPerPackage || 0) +
      Number(looseBoxCount || 0)
    );
  };

  const totalSampleQuantity = (samplingRecords) => {
    if (!Array.isArray(samplingRecords) || samplingRecords.length === 0) {
      return "";
    }

    return samplingRecords.reduce(
      (total, record) => total + (Number(record.quantity) || 0),
      0,
    );
  };

  const output = data.map((item) => {
    const po = item.productionOrder || {};
    const hangHoa = po.item || {};
    const registration = hangHoa.registration || {};
    const productLine = hangHoa.productionSpecification?.productLine || {};
    const documentControl = po.documentControl || {};

    const maHang = hangHoa.item_code || po.item_code || "";
    const soLo = po.lot_no || "";

    const noiDungSaiLech = (po.deviations || [])
      .map((deviation) => deviation.deviation_content)
      .filter(Boolean)
      .join(", ");

    return [
      formatDateTime(item.created_at), // A: Thời điểm nhập thành phẩm
      [maHang, soLo].filter(Boolean).join("-"), // B: Mã hàng và số lô
      maHang, // C: Mã hàng
      hangHoa.item_name || po.description || "", // D: Tên hàng
      asLotText(soLo), // E: Số lô TP
      po.planned_quatity ?? "", // F: Cỡ lô TP
      hangHoa.unit || po.unit || "", // G: Đơn vị tính
      formatDate(po.date_manufacture), // H: NSX
      formatDate(po.expire_date), // I: HSD
      registration.registration_number || "", // J: Số đăng ký
      formatDate(po.start_date), // K: Ngày bắt đầu sản xuất
      po.remarks || "", // L: Ghi chú
      productLine.name || productLine.code || "", // M: Dòng sản phẩm
      ...Array(17).fill(""), // N:AD để trống
    ];
  });

  // Giữ header dòng 1; chỉ xoá và ghi dữ liệu từ dòng 2, cột A:AD.
  const oldRowCount = sheet.getLastRow() - 1;

  if (oldRowCount > 0) {
    sheet.getRange(2, 1, oldRowCount, 30).clearContent();
  }

  if (output.length > 0) {
    // Cột E giữ định dạng text để không mất số 0 đầu số lô.
    sheet.getRange(2, 5, output.length, 1).setNumberFormat("@");

    // Ghi dữ liệu A:AD.
    sheet.getRange(2, 1, output.length, 30).setValues(output);
  }
}
