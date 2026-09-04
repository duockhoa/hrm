const normalizeDecimalText = (value: string) => value.trim().replace(",", ".");

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

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    maximumFractionDigits: 4,
  });
};

const formatPercent = (value: string | number | null | undefined) => {
  const formattedValue = formatNumber(value);

  return formattedValue ? `${formattedValue}%` : "";
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
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

const getWorkshopLabel = (
  workshop:
    | {
        code?: string | null;
        name?: string | null;
      }
    | null
    | undefined,
  fallback?: string | number | null,
) => {
  if (workshop?.code && workshop?.name) {
    return `${workshop.code} - ${workshop.name}`;
  }

  return workshop?.name ?? workshop?.code ?? formatText(fallback);
};

export {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatText,
  getUserLabel,
  getWorkshopLabel,
  normalizeDecimalText,
};
