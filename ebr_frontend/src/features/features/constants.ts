const FEATURE_KINDS = [
  { value: "action", label: "Action" },
  { value: "section", label: "Section" },
  { value: "view", label: "View" },
];

const FEATURE_GROUPS = [
  { value: "Biểu mẫu chung", label: "Biểu mẫu chung" },
  { value: "Biểu mẫu Pha chế", label: "Biểu mẫu Pha chế" },
  { value: "Biểu mẫu hoàn thiện", label: "Biểu mẫu hoàn thiện" },
];

const FEATURE_KIND_ORDER: Record<string, number> = {
  action: 0,
  section: 1,
  view: 2,
};

const getFeatureKindOrder = (kind: string) => FEATURE_KIND_ORDER[kind] ?? 99;

export { FEATURE_GROUPS, FEATURE_KINDS, getFeatureKindOrder };
