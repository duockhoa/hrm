type FactoryReleaseReviewUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderFactoryReleaseReview = {
  id?: number | string;
  production_order_id?: number | string | null;
  approved_by_id?: number | string | null;
  registration_number?: string | null;
  raw_material_test_result?: string | null;
  water_test_result?: string | null;
  compressed_air_test_result?: string | null;
  filter_integrity_test_result?: string | null;
  packaging_inspection_result?: string | null;
  finished_product_test_result?: string | null;
  sterilization_result?: string | null;
  online_particle_result?: string | null;
  yield_quantity?: string | null;
  deviation?: string | null;
  environment_monitoring_result?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  approvedBy?: FactoryReleaseReviewUser | null;
  createdBy?: FactoryReleaseReviewUser | null;
};

type FactoryReleaseReviewPayload = {
  approved_by_id?: number | string | null;
  registration_number: string;
  raw_material_test_result?: string | null;
  water_test_result?: string | null;
  compressed_air_test_result?: string | null;
  filter_integrity_test_result?: string | null;
  packaging_inspection_result?: string | null;
  finished_product_test_result?: string | null;
  sterilization_result?: string | null;
  online_particle_result?: string | null;
  yield_quantity?: string | null;
  deviation?: string | null;
  environment_monitoring_result?: string | null;
};

export type {
  FactoryReleaseReviewPayload,
  FactoryReleaseReviewUser,
  ProductionOrderFactoryReleaseReview,
};
