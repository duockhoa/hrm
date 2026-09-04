import type { MixingActivityTemplate } from "./types";

const getCreatorLabel = (template: MixingActivityTemplate) =>
  template.createdBy?.full_name ??
  template.createdBy?.name ??
  template.createdBy?.username ??
  template.createdBy?.email ??
  template.created_by_id ??
  "—";

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

const formatBatchSize = (value: number | string) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue)
    ? parsedValue.toLocaleString("vi-VN", { maximumFractionDigits: 12 })
    : String(value);
};

export { formatBatchSize, formatDateTime, getCreatorLabel };
