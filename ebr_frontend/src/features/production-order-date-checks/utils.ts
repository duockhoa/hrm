const PACKAGE_TYPE_LABELS: Record<string, string> = {
  goi: "Gói",
  lo: "Lọ",
  chai: "Chai",
  hop: "Hộp",
  thung: "Thùng",
  ong_be: "Ống bẻ",
};

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const PACKAGE_TYPE_OPTIONS = [
  { value: "goi", label: "Gói" },
  { value: "lo", label: "Lọ" },
  { value: "chai", label: "Chai" },
  { value: "hop", label: "Hộp" },
  { value: "thung", label: "Thùng" },
  { value: "ong_be", label: "Ống bẻ" },
];

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const formatPackageType = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return PACKAGE_TYPE_LABELS[value] ?? value;
};

const formatApprovalStatus = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return APPROVAL_STATUS_LABELS[value] ?? value;
};

const getUserLabel = (
  user:
    | {
        name?: string | null;
        username?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
) => user?.name ?? user?.username ?? user?.email ?? "";

const toAssetUrl = (path: string | null | undefined) => {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

const getFileNameFromPath = (path: string | null | undefined) => {
  if (!path) {
    return "";
  }

  return path.split("/").filter(Boolean).at(-1) ?? path;
};

export {
  PACKAGE_TYPE_OPTIONS,
  formatApprovalStatus,
  formatDateTime,
  formatPackageType,
  formatText,
  getFileNameFromPath,
  getUserLabel,
  toAssetUrl,
};
