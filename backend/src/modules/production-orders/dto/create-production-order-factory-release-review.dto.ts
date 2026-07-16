export class CreateProductionOrderFactoryReleaseReviewDto {
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
  yield_quantity?: number | string | null;
  deviation?: string | null;
  environment_monitoring_result?: string | null;
}
