import type { SecondaryPackagingCheckUser } from "./types";

const formatText = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getUserLabel = (user?: SecondaryPackagingCheckUser | null) =>
  user?.full_name || user?.name || user?.username || user?.employee_code || "—";

const formatQuantity = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isNaN(number) ? String(value) : number.toLocaleString("vi-VN");
};

export { formatDateTime, formatQuantity, formatText, getUserLabel };
