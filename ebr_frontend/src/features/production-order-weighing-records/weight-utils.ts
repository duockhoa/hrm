export const normalizeWeight = (
  input: string,
  allowNegative = false,
): string | null => {
  const value = input.trim().replace(",", ".");
  if (!/^-?\d{1,12}(\.\d{1,6})?$/.test(value)) return null;
  if (!allowNegative && value.startsWith("-")) return null;
  const [whole, fraction = ""] = value.split(".");
  if (BigInt(whole) === BigInt(0) && !/[1-9]/.test(fraction)) return null;
  return value;
};

export const formatWeight = (value: string) => {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const decimals = fraction.replace(/0+$/, "");
  return `${negative ? "-" : ""}${BigInt(whole).toLocaleString("vi-VN")}${decimals ? `,${decimals}` : ""}`;
};

export const sumWeights = (values: string[]): string => {
  const total = values.reduce((sum, value) => {
    const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
    return (
      sum +
      (value.startsWith("-") ? BigInt(-1) : BigInt(1)) *
        (BigInt(whole) * BigInt(1000000) + BigInt(fraction.padEnd(6, "0")))
    );
  }, BigInt(0));
  const absolute = total < BigInt(0) ? -total : total;
  const whole = absolute / BigInt(1000000);
  const fraction = (absolute % BigInt(1000000))
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return `${total < BigInt(0) ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
};
