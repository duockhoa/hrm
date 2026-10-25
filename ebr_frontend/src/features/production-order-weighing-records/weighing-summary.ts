type SummaryLine = {
  item_code: string;
  details?: {
    id: number;
    note: string | null;
    weighedBy?: { name?: string | null; username?: string | null } | null;
  }[];
};

export function summarizeWeighings(lines: SummaryLine[]) {
  const notes: string[] = [];
  const names = new Set<string>();
  for (const line of [...lines].sort((a, b) =>
    a.item_code.localeCompare(b.item_code, "vi"),
  )) {
    for (const detail of [...(line.details ?? [])].sort(
      (a, b) => a.id - b.id,
    )) {
      const note = detail.note?.trim();
      if (note) notes.push(`${line.item_code}: ${note}`);
      const name =
        detail.weighedBy?.name?.trim() || detail.weighedBy?.username?.trim();
      if (name) names.add(name);
    }
  }
  return { notes: notes.join(", "), weighers: [...names].join(", ") };
}
