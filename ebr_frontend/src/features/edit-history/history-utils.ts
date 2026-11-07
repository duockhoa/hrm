import type {
  EditHistoryEntry,
  EditHistoryField,
  EditHistoryFields,
} from "./types";

export function getHistoryChanges(
  entry: EditHistoryEntry,
  fields: EditHistoryFields,
) {
  return Object.entries(fields).flatMap(([key, field]) => {
    const before = entry.old_values?.[key];
    const after = entry.new_values?.[key];
    const hasBefore = Object.prototype.hasOwnProperty.call(
      entry.old_values ?? {},
      key,
    );
    const hasAfter = Object.prototype.hasOwnProperty.call(
      entry.new_values ?? {},
      key,
    );
    if (!hasBefore && !hasAfter) return [];
    if (
      entry.action === "UPDATE" &&
      hasBefore &&
      hasAfter &&
      JSON.stringify(before) === JSON.stringify(after)
    ) {
      return [];
    }
    return [{ key, field, before, after, hasBefore, hasAfter }];
  });
}

export function formatHistoryValue(value: unknown, field: EditHistoryField) {
  if (value === null || value === undefined || value === "") return "—";
  if (
    field.type === "number" &&
    (typeof value === "string" || typeof value === "number")
  ) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue))
      return numberValue.toLocaleString("vi-VN");
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
