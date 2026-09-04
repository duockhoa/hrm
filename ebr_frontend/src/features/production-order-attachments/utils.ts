const ATTACHMENT_TYPE_OPTIONS = [
  { value: "packaging_slip", label: "Phiếu đóng gói" },
  { value: "registration_number", label: "Số đăng ký" },
  { value: "production", label: "Sản xuất" },
  { value: "quality_check", label: "Kiểm tra chất lượng" },
  { value: "completion", label: "Hoàn thành" },
  { value: "defect", label: "Lỗi" },
] as const;

const ALLOWED_ATTACHMENT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_ATTACHMENT_FILES_PER_REQUEST = 10;
const MAX_ATTACHMENT_FILE_SIZE = 20 * 1024 * 1024;

const formatAttachmentType = (value?: string | null) =>
  ATTACHMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
  value ??
  "";

const formatApprovalStatus = (value?: string | null) => {
  if (value === "pending") return "Chờ duyệt";
  if (value === "approved") return "Đã duyệt";
  if (value === "rejected") return "Đã từ chối";
  return "Không yêu cầu duyệt";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getUserLabel = (
  user?: { name?: string | null; username?: string | null; email?: string | null } | null,
) => user?.name ?? user?.username ?? user?.email ?? "";

const getFileName = (filePath?: string | null) => {
  if (!filePath) return "";
  const cleanPath = filePath.split("?")[0];
  return decodeURIComponent(cleanPath.split("/").pop() ?? "");
};

const validateAttachmentFiles = (files: File[]) => {
  if (files.length === 0) return "Vui lòng chọn ít nhất một ảnh.";
  if (files.length > MAX_ATTACHMENT_FILES_PER_REQUEST) {
    return `Tối đa ${MAX_ATTACHMENT_FILES_PER_REQUEST} ảnh cho mỗi lần tải lên.`;
  }

  const invalidFile = files.find(
    (file) => !ALLOWED_ATTACHMENT_IMAGE_TYPES.has(file.type),
  );
  if (invalidFile) {
    return `Ảnh ${invalidFile.name} không đúng định dạng JPG, PNG, WEBP hoặc GIF.`;
  }

  const oversizedFile = files.find(
    (file) => file.size > MAX_ATTACHMENT_FILE_SIZE,
  );
  if (oversizedFile) {
    return `Ảnh ${oversizedFile.name} vượt quá dung lượng 20 MB.`;
  }

  return null;
};

export {
  ATTACHMENT_TYPE_OPTIONS,
  MAX_ATTACHMENT_FILES_PER_REQUEST,
  formatApprovalStatus,
  formatAttachmentType,
  formatDateTime,
  getFileName,
  getUserLabel,
  validateAttachmentFiles,
};
