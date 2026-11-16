export const formatReceiptDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN");

export const formatExpiryDate = (value: string | null) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "";

export const formatReceiptQuantity = (value: string | number | null) =>
  value == null
    ? ""
    : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
