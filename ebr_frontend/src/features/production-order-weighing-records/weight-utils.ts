export const normalizeWeight = (input: string): string | null => {
  const value = input.trim().replace(",", ".");
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  if (BigInt(whole) === BigInt(0) && !/[1-9]/.test(fraction)) return null;
  return value;
};

export const formatWeight = (value: string) => {
  if (!/^\d+(\.\d+)?$/.test(value)) return value;
  const [whole, fraction = ""] = value.split(".");
  const decimals = fraction.replace(/0+$/, "");
  return `${BigInt(whole).toLocaleString("vi-VN")}${decimals ? `,${decimals}` : ""}`;
};

export const sumWeights = (values: string[]): string => {
  const total = values.reduce((sum, value) => {
    const [whole, fraction = ""] = value.split(".");
    return (
      sum + BigInt(whole) * BigInt(1000000) + BigInt(fraction.padEnd(6, "0"))
    );
  }, BigInt(0));
  const whole = total / BigInt(1000000);
  const fraction = (total % BigInt(1000000))
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
};
