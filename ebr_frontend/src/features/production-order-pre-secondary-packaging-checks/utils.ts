import type { PreSecondaryPackagingCheckUser } from "./types";

const MAX_CHECK_IMAGES = 70;
const MAX_CHECK_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const CHECK_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const ALLOWED_CHECK_IMAGE_TYPES = new Set(CHECK_IMAGE_ACCEPT.split(","));

const validateCheckImages = (files: File[], existingCount = 0) => {
  if (existingCount + files.length > MAX_CHECK_IMAGES) {
    return `Mỗi bản ghi chỉ được có tối đa ${MAX_CHECK_IMAGES} ảnh.`;
  }

  const invalidType = files.find(
    (file) => !ALLOWED_CHECK_IMAGE_TYPES.has(file.type),
  );
  if (invalidType) {
    return `Ảnh “${invalidType.name}” không đúng định dạng JPG, PNG, WEBP hoặc GIF.`;
  }

  const oversized = files.find(
    (file) => file.size > MAX_CHECK_IMAGE_SIZE_BYTES,
  );
  if (oversized) {
    return `Ảnh “${oversized.name}” vượt quá 20 MB.`;
  }

  return null;
};

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatQuantity = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "—";
  const numericValue = Number(value);
  return Number.isNaN(numericValue)
    ? String(value)
    : numericValue.toLocaleString("vi-VN");
};

const getUserLabel = (user?: PreSecondaryPackagingCheckUser | null) =>
  user?.name ?? user?.username ?? user?.email ?? "—";

export {
  CHECK_IMAGE_ACCEPT,
  formatDateTime,
  formatQuantity,
  getUserLabel,
  MAX_CHECK_IMAGES,
  validateCheckImages,
};
