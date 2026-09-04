const HYGIENE_CLEANING_TYPE_OPTIONS = [
  { value: "Đầu ca", label: "Đầu ca" },
  { value: "Cuối ca", label: "Cuối ca" },
  { value: "Định kỳ", label: "Định kỳ" },
];

const HYGIENE_RESULT_OPTIONS = [
  { value: "Đạt", label: "Đạt" },
  { value: "Không đạt", label: "Không đạt" },
];

const roomOrEquipmentQrKeys = [
  "room_or_equipment",
  "room",
  "phong",
  "phòng",
  "room_name",
  "room_code",
  "equipment",
  "equipment_name",
  "equipment_code",
  "thiet_bi",
  "thiết_bị",
  "device",
  "name",
  "code",
];

const normalizeOptionalText = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
};

const getValueByKeys = (source: Record<string, unknown>, keys: string[]) => {
  const sourceEntries = Object.entries(source);

  for (const key of keys) {
    const match = sourceEntries.find(
      ([sourceKey]) => sourceKey.toLowerCase() === key.toLowerCase(),
    );

    if (match?.[1] !== undefined && match[1] !== null) {
      return String(match[1]);
    }
  }

  return null;
};

const parseQrRoomOrEquipment = (decodedText: string) => {
  const text = decodedText.trim();

  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const value = getValueByKeys(
        json as Record<string, unknown>,
        roomOrEquipmentQrKeys,
      );
      if (value) {
        return value.trim();
      }
    }
  } catch {
    // QR may be plain text, a URL, or query params.
  }

  try {
    const url = new URL(text);
    const value = getValueByKeys(
      Object.fromEntries(url.searchParams.entries()),
      roomOrEquipmentQrKeys,
    );
    if (value) {
      return value.trim();
    }
  } catch {
    const params = new URLSearchParams(text);
    const value = getValueByKeys(
      Object.fromEntries(params.entries()),
      roomOrEquipmentQrKeys,
    );
    if (value) {
      return value.trim();
    }
  }

  return text;
};

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
  HYGIENE_CLEANING_TYPE_OPTIONS,
  HYGIENE_RESULT_OPTIONS,
  formatDateTime,
  formatText,
  getUserLabel,
  normalizeOptionalText,
  parseQrRoomOrEquipment,
};
