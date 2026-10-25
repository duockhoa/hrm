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

export const getWeightStatus = (
  requiredTotal: string,
  actualTotal: string,
): "below" | "within" | "above" => {
  // Compare in millionths so values exactly on a decimal boundary stay green.
  const scaled = (value: string) => {
    const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
    return (
      (value.startsWith("-") ? BigInt(-1) : BigInt(1)) *
      (BigInt(whole) * BigInt(1000000) + BigInt(fraction.padEnd(6, "0")))
    );
  };
  const required = scaled(requiredTotal);
  const tolerance = scaled(
    required >= scaled("100000")
      ? "200"
      : required >= scaled("10000")
        ? "100"
        : required >= scaled("4000")
          ? "50"
          : required >= scaled("10")
            ? "0.1"
            : "0.02",
  );
  const difference = scaled(actualTotal) - required;
  if (difference < -tolerance) return "below";
  if (difference > tolerance) return "above";
  return "within";
};

export const groupRequiredQuantities = <
  T extends {
    item_code: string;
    unit: string;
    planned_quantity: string;
    details?: { net_weight: string; unit: string }[];
  },
>(
  lines: T[],
) => {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    const key = JSON.stringify([line.item_code, line.unit]);
    const group = groups.get(key) ?? [];
    group.push(line);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((group) => {
    const requiredTotal = sumWeights(
      group.map((line) => line.planned_quantity),
    );
    const weightsByUnit = new Map<string, string[]>();
    for (const line of group) {
      for (const detail of line.details ?? []) {
        const weights = weightsByUnit.get(detail.unit) ?? [];
        weights.push(detail.net_weight);
        weightsByUnit.set(detail.unit, weights);
      }
    }
    const actualTotals = [...weightsByUnit].map(([unit, weights]) => ({
      unit,
      total: sumWeights(weights),
    }));
    return group.map((line, index) => ({
      line,
      requiredTotal,
      actualTotals,
      requiredRowSpan: index === 0 ? group.length : 0,
    }));
  });
};
