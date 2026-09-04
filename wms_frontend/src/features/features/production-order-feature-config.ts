type ProductionOrderFeatureEntry = {
  key: string;
  kind: string;
  order?: number | null;
  enabled?: boolean;
};

type ProductionOrderFeatureConfig = {
  actions?: ProductionOrderFeatureEntry[];
  sections?: ProductionOrderFeatureEntry[];
  features?: ProductionOrderFeatureEntry[];
} | null;

type ProductionOrderFeatureKind = "action" | "section";

const FRONTEND_DEFAULT_ENABLED_KEYS: Record<
  ProductionOrderFeatureKind,
  Set<string>
> = {
  action: new Set([""]),
  section: new Set(["production_order_lines"]),
};

const FRONTEND_ALWAYS_ENABLED_KEYS: Record<
  ProductionOrderFeatureKind,
  Set<string>
> = {
  action: new Set([
    "export_warehouse_release",
    "export_weighing_ticket",
    "export_production_order",
    "create_semi_finished_product_label",
    "create_dispensed_material_label",
    "create_equipment_monitoring_record",
    "create_sampling_request",
    "create_sampling_record",
    "issue_batch_record",
    "receive_batch_record",
    "receive_warehouse_release",
    "receive_test_certificate",
  ]),
  section: new Set([]),
};

const FEATURE_KEY_ALIASES: Record<string, string> = {
  "vial-inspection-summary": "vial_inspection_checks",
  vial_inspection_summary: "vial_inspection_checks",
  vial_inspection_summaries: "vial_inspection_checks",
};

const normalizeFeatureKey = (key: string) => FEATURE_KEY_ALIASES[key] ?? key;

const hasFeatureConfig = (featureConfig: ProductionOrderFeatureConfig) =>
  Boolean(
    featureConfig &&
    ((featureConfig.actions?.length ?? 0) > 0 ||
      (featureConfig.sections?.length ?? 0) > 0 ||
      (featureConfig.features?.length ?? 0) > 0),
  );

const getEntriesByKind = (
  featureConfig: ProductionOrderFeatureConfig,
  kind: ProductionOrderFeatureKind,
) => {
  if (kind === "action") {
    return featureConfig?.actions ?? [];
  }

  return featureConfig?.sections ?? [];
};

const isProductionOrderFeatureEnabled = (
  featureConfig: ProductionOrderFeatureConfig,
  kind: ProductionOrderFeatureKind,
  key: string,
) => {
  const normalizedKey = normalizeFeatureKey(key);

  if (FRONTEND_ALWAYS_ENABLED_KEYS[kind].has(normalizedKey)) {
    return true;
  }

  if (!hasFeatureConfig(featureConfig)) {
    return (
      FRONTEND_DEFAULT_ENABLED_KEYS[kind].has(normalizedKey) ||
      FRONTEND_ALWAYS_ENABLED_KEYS[kind].has(normalizedKey)
    );
  }

  const entries = getEntriesByKind(featureConfig, kind);
  const configuredFeature = entries.find(
    (feature) => normalizeFeatureKey(feature.key) === normalizedKey,
  );

  if (configuredFeature) {
    return Boolean(configuredFeature.enabled);
  }

  return FRONTEND_DEFAULT_ENABLED_KEYS[kind].has(normalizedKey);
};

const getEnabledProductionOrderFeatureKeys = (
  featureConfig: ProductionOrderFeatureConfig,
  kind: ProductionOrderFeatureKind,
  fallbackKeys: string[],
) => {
  const normalizedFallbackKeys = fallbackKeys.map(normalizeFeatureKey);

  if (!hasFeatureConfig(featureConfig)) {
    return Array.from(
      new Set(
        normalizedFallbackKeys.filter(
          (key) =>
            FRONTEND_DEFAULT_ENABLED_KEYS[kind].has(key) ||
            FRONTEND_ALWAYS_ENABLED_KEYS[kind].has(key),
        ),
      ),
    );
  }

  const fallbackKeySet = new Set(normalizedFallbackKeys);

  const entries = getEntriesByKind(featureConfig, kind);
  const configuredKeys = new Set(
    entries.map((feature) => normalizeFeatureKey(feature.key)),
  );
  const enabledKeys = entries
    .filter(
      (feature) =>
        (feature.enabled ||
          FRONTEND_ALWAYS_ENABLED_KEYS[kind].has(
            normalizeFeatureKey(feature.key),
          )) &&
        fallbackKeySet.has(normalizeFeatureKey(feature.key)),
    )
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0))
    .map((feature) => normalizeFeatureKey(feature.key));

  const missingDefaultKeys = normalizedFallbackKeys.filter(
    (key) =>
      !configuredKeys.has(key) &&
      (FRONTEND_DEFAULT_ENABLED_KEYS[kind].has(key) ||
        FRONTEND_ALWAYS_ENABLED_KEYS[kind].has(key)),
  );

  return Array.from(new Set([...enabledKeys, ...missingDefaultKeys]));
};

export {
  getEnabledProductionOrderFeatureKeys,
  isProductionOrderFeatureEnabled,
  type ProductionOrderFeatureConfig,
};
