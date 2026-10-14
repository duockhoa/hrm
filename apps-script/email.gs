/**
 * Email Web App used by APPS_SCRIPT_EMAIL_API_URL.
 * Deploy in the email Apps Script project, separately from the data export scripts.
 * Supports the existing payload plus base64 inlineImages and attachments.
 * https://developers.google.com/apps-script/reference/gmail/gmail-app
 * Required OAuth scope: https://mail.google.com/
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const recipients = (Array.isArray(payload.recipients)
      ? payload.recipients
      : [payload.recipients])
      .join(",")
      .split(",")
      .map(function (email) { return email.trim(); })
      .filter(Boolean);
    if (!recipients.length || !payload.subject || (!payload.message && !payload.html)) {
      throw new Error("Recipients, subject and message or html are required");
    }

    let totalBytes = 0;
    function fileBlob(file) {
      if (!file || typeof file.filename !== "string" || !file.filename.trim() ||
          /[/\\\r\n]/.test(file.filename) || file.filename.indexOf("\0") !== -1 ||
          typeof file.contentType !== "string" ||
          !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(file.contentType) ||
          typeof file.contentBase64 !== "string" || !file.contentBase64 ||
          file.contentBase64.length % 4 !== 0 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(file.contentBase64)) {
        throw new Error("Invalid email file");
      }
      const bytes = Utilities.base64Decode(file.contentBase64);
      totalBytes += bytes.length;
      if (totalBytes > 16 * 1024 * 1024) throw new Error("Email files exceed 16 MB");
      return Utilities.newBlob(bytes, file.contentType, file.filename.trim());
    }

    const options = {};
    if (payload.senderName) options.name = payload.senderName;
    if (payload.html) options.htmlBody = payload.html;
    if (payload.inlineImages !== undefined) {
      if (!payload.inlineImages || typeof payload.inlineImages !== "object" || Array.isArray(payload.inlineImages)) {
        throw new Error("Invalid inline images");
      }
      const inlineImages = {};
      Object.keys(payload.inlineImages).forEach(function (key) {
        const file = payload.inlineImages[key];
        if (!/^[a-z][a-z0-9_]*$/i.test(key) || !file ||
            typeof file.contentType !== "string" || file.contentType.indexOf("image/") !== 0) {
          throw new Error("Invalid inline image");
        }
        inlineImages[key] = fileBlob(file);
      });
      if (Object.keys(inlineImages).length) options.inlineImages = inlineImages;
    }
    if (payload.attachments !== undefined) {
      if (!Array.isArray(payload.attachments)) throw new Error("Invalid attachments");
      if (payload.attachments.length) options.attachments = payload.attachments.map(fileBlob);
    }

    GmailApp.sendEmail(
      recipients.join(","),
      String(payload.subject),
      payload.message || "Xem nội dung HTML trong email.",
      options,
    );
    return emailJsonResponse({ status: "success", message: "Email sent successfully" });
  } catch (error) {
    return emailJsonResponse({ status: "error", message: error.message || String(error) });
  }
}

/** Run once in the Apps Script editor to authorize Gmail without sending email. */
function authorizeGmail() {
  GmailApp.getAliases();
}

function emailJsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
