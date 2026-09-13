export type CheckControlLimits = {
  lower_limit: number | null;
  upper_limit: number | null;
};

export type CalculatedCheckRequirement = CheckControlLimits & {
  requirement: string;
};

export const emptyCheckRequirement = (): CalculatedCheckRequirement => ({
  requirement: "",
  lower_limit: null,
  upper_limit: null,
});

export const roundControlLimit = (value: number | null, decimals: number) =>
  value !== null && Number.isFinite(value)
    ? Number(value.toFixed(decimals))
    : null;

export const parseControlLimit = (
  value: string | number | null | undefined,
  decimals: number,
) => {
  if (value == null || String(value).trim() === "") return null;
  return roundControlLimit(
    Number(String(value).trim().replace(",", ".")),
    decimals,
  );
};

// Edit forms preserve the calculated limits saved with the original check.
export const storedControlLimits = (data: {
  lower_limit?: string | number | null;
  upper_limit?: string | number | null;
}): CheckControlLimits => ({
  lower_limit: parseControlLimit(data.lower_limit, 3),
  upper_limit: parseControlLimit(data.upper_limit, 3),
});
