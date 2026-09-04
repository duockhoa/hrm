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

const normalizeDecimalText = (value: string) => value.trim().replace(",", ".");

const formatDecimal = (
  value: string | number | null | undefined,
  fractionDigits = 2,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
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

const getFileNameFromPath = (path: string | null | undefined) => {
  if (!path) {
    return "";
  }

  return decodeURIComponent(path.split("/").pop() ?? path);
};

export {
  formatDateTime,
  formatDecimal,
  formatText,
  getFileNameFromPath,
  getUserLabel,
  normalizeDecimalText,
};
