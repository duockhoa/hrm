const SAMPLING_TYPE_OPTIONS = [
  { value: "Mẫu kiểm nghiệm", label: "Mẫu kiểm nghiệm" },
  {
    value: "Mẫu theo dõi độ ổn định",
    label: "Mẫu theo dõi độ ổn định",
  },
  { value: "Mẫu nghiên cứu", label: "Mẫu nghiên cứu" },
  { value: "Khác", label: "Khác" },
];

const SAMPLING_UNIT_OPTIONS = [
  { value: "hộp", label: "Hộp" },
  { value: "lọ", label: "Lọ" },
  { value: "viên", label: "Viên" },
  { value: "vỉ", label: "Vỉ" },
  { value: "túi", label: "Túi" },
];

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
    maximumFractionDigits: 2,
  });
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

export {
  SAMPLING_TYPE_OPTIONS,
  SAMPLING_UNIT_OPTIONS,
  formatDateTime,
  formatNumber,
  formatText,
  getUserLabel,
  normalizeDecimalText,
};
