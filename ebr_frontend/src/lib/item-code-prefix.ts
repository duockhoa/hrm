export const getItemCodePrefix = (
  itemCode: string | number | null | undefined,
) => {
  const normalizedItemCode = String(itemCode ?? "").trim().toUpperCase();
  const prefix = normalizedItemCode.match(/^[A-Z]+/)?.[0];

  return prefix || null;
};
