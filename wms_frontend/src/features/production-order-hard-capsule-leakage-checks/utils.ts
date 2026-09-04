const HARD_CAPSULE_LEAKAGE_STAGE_OPTIONS = [
  { value: "before_coating", label: "Trước bao" },
  { value: "after_coating", label: "Sau bao" },
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

const formatStage = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return (
    HARD_CAPSULE_LEAKAGE_STAGE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
};

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN");
};

const formatLeakageRate = (
  testedCount: string | number | null | undefined,
  leakedCount: string | number | null | undefined,
) => {
  if (
    testedCount === null ||
    testedCount === undefined ||
    testedCount === "" ||
    leakedCount === null ||
    leakedCount === undefined ||
    leakedCount === ""
  ) {
    return "";
  }

  const tested = Number(testedCount);
  const leaked = Number(leakedCount);

  if (
    !Number.isFinite(tested) ||
    !Number.isFinite(leaked) ||
    tested <= 0 ||
    leaked < 0
  ) {
    return "";
  }

  return `${((leaked / tested) * 100).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
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
  HARD_CAPSULE_LEAKAGE_STAGE_OPTIONS,
  formatDateTime,
  formatLeakageRate,
  formatNumber,
  formatStage,
  formatText,
  getUserLabel,
};
