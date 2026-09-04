type ItemCodeLike = {
  item_code?: string | number | null;
};

const collator = new Intl.Collator("vi-VN", {
  numeric: true,
  sensitivity: "base",
});

export const sortByItemCodeDesc = <T extends ItemCodeLike>(items: T[]) =>
  [...items].sort((first, second) =>
    collator.compare(String(second.item_code ?? ""), String(first.item_code ?? "")),
  );
