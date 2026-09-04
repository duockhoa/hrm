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

const toNumber = (value: string) => Number(normalizeDecimalText(value));

const formatDecimal = (
  value: string | number | null | undefined,
  fractionDigits = 4,
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

const formatCarrIndexPreview = (
  bulkDensity: string,
  tappedDensity: string,
) => {
  if (!bulkDensity || !tappedDensity) {
    return "";
  }

  const bulk = toNumber(bulkDensity);
  const tapped = toNumber(tappedDensity);

  if (
    Number.isNaN(bulk) ||
    Number.isNaN(tapped) ||
    tapped <= 0 ||
    tapped < bulk
  ) {
    return "";
  }

  const carrIndex = ((tapped - bulk) / tapped) * 100;

  if (!Number.isFinite(carrIndex)) {
    return "";
  }

  return carrIndex.toLocaleString("vi-VN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
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
  formatCarrIndexPreview,
  formatDateTime,
  formatDecimal,
  formatText,
  getFileNameFromPath,
  getUserLabel,
  normalizeDecimalText,
  toNumber,
};
