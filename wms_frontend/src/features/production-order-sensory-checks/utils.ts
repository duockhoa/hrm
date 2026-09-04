const SENSORY_OPTION_VALUES = {
  samePreviousLot: "Giống lô trước",
  differentPreviousLot: "Không giống lô trước",
} as const;

type SensoryOptionValue =
  (typeof SENSORY_OPTION_VALUES)[keyof typeof SENSORY_OPTION_VALUES];

const SENSORY_OPTIONS = [
  {
    value: SENSORY_OPTION_VALUES.samePreviousLot,
    label: "Giống lô trước",
  },
  {
    value: SENSORY_OPTION_VALUES.differentPreviousLot,
    label: "Không giống lô trước",
  },
] as const;

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
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
};

const formatSensoryOption = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const textValue = String(value);
  return (
    SENSORY_OPTIONS.find((option) => option.value === textValue)?.label ??
    textValue
  );
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
  SENSORY_OPTIONS,
  SENSORY_OPTION_VALUES,
  formatDateTime,
  formatSensoryOption,
  formatText,
  getFileNameFromPath,
  getUserLabel,
  type SensoryOptionValue,
};
