const AUTH = {
  login: "/auth/login",
  refreshToken: "/auth/refresh-token",
  logout: "/auth/logout",
};

const USERS = {
  base: "/users",
  me: "/users/me",
  myPermissions: "/users/me/permissions",
  addUser: "/users",
  applications: (userId: string | number) => `/users/${userId}/applications`,
  uploadAvatar: "/users/me/avatar",
  changePassword: "/users/me/change-password",
};

const INTERNAL = {
  auth: "/api/auth",
};

const DEPARTMENT = {
  base: "/departments",
};

const COMPANY = {
  base: "/companies",
};

const ITEMS = {
  base: "/items",
  finishedProducts: "/items/finished-products",
  semiFinishedProducts: "/items/semi-finished-products",
  rawMaterials: "/items/raw-materials",
  allMixingActivityTemplates: "/items/mixing-activity-templates",
  mixingActivityTemplates: (itemCode: string) =>
    `/items/${encodeURIComponent(itemCode)}/mixing-activity-templates`,
  copyMixingActivityTemplate: (itemCode: string) =>
    `/items/${encodeURIComponent(itemCode)}/mixing-activity-templates/copy`,
  mixingActivityTemplateDetail: (templateId: string | number) =>
    `/items/mixing-activity-templates/${templateId}`,
  mixingActivityTemplateStages: (templateId: string | number) =>
    `/items/mixing-activity-templates/${templateId}/stages`,
  mixingActivityTemplateStageDetail: (stageId: string | number) =>
    `/items/mixing-activity-template-stages/${stageId}`,
  mixingActivityTemplateStageSteps: (stageId: string | number) =>
    `/items/mixing-activity-template-stages/${stageId}/steps`,
  mixingActivityTemplateStageStepDetail: (stepId: string | number) =>
    `/items/mixing-activity-template-stage-steps/${stepId}`,
  mixingActivityTemplateStageStepParameters: (stepId: string | number) =>
    `/items/mixing-activity-template-stage-steps/${stepId}/parameters`,
  mixingActivityTemplateStageStepParameterDetail: (
    parameterId: string | number,
  ) => `/items/mixing-activity-template-stage-step-parameters/${parameterId}`,
  equipment: (itemCode: string) =>
    `/items/${encodeURIComponent(itemCode)}/equipment`,
  equipmentCopy: (itemCode: string) =>
    `/items/${encodeURIComponent(itemCode)}/equipment/copy`,
  equipmentDetail: (itemEquipmentId: string | number) =>
    `/items/equipment/${itemEquipmentId}`,
};

const REGISTRATION_NUMBERS = {
  base: "/registration-numbers",
};

const PRODUCTION_ORDERS = {
  base: "/production-orders",
  mixingRecords: (id: string | number) =>
    `/production-orders/${id}/mixing-records`,
  mixingRecordDetail: (recordId: string | number) =>
    `/production-orders/mixing-records/${recordId}`,
  mixingRecordQaStaffApproval: (recordId: string | number) =>
    `/production-orders/mixing-records/${recordId}/qa-staff-approval`,
  mixingRecordIpcStaffApproval: (recordId: string | number) =>
    `/production-orders/mixing-records/${recordId}/ipc-staff-approval`,
  mixingRecordStages: (recordId: string | number) =>
    `/production-orders/mixing-records/${recordId}/stages`,
  mixingRecordStageDetail: (stageId: string | number) =>
    `/production-orders/mixing-record-stages/${stageId}`,
  mixingRecordStageSteps: (stageId: string | number) =>
    `/production-orders/mixing-record-stages/${stageId}/steps`,
  mixingRecordStepDetail: (stepId: string | number) =>
    `/production-orders/mixing-record-steps/${stepId}`,
  mixingRecordStepParameters: (stepId: string | number) =>
    `/production-orders/mixing-record-steps/${stepId}/parameters`,
  mixingRecordParameterDetail: (parameterId: string | number) =>
    `/production-orders/mixing-record-parameters/${parameterId}`,
  mixingRecordParameterResult: (parameterId: string | number) =>
    `/production-orders/mixing-record-parameters/${parameterId}/result`,
  mixingRecordParameterImage: (parameterId: string | number) =>
    `/production-orders/mixing-record-parameters/${parameterId}/image`,
  mixingRecordParameterImageFile: (filename: string) =>
    `/production-orders/mixing-record-parameters/images/${encodeURIComponent(filename)}`,
  sapB1Connector: (id: string | number) =>
    `/sap-b1-connector/production-orders/${id}`,
  changeContent: (id: string | number) =>
    `/production-orders/${id}/change-content`,
  finishedProducts: "/production-orders/finished-products",
  semiFinishedProducts: "/production-orders/semi-finished-products",
  environmentChecks: (id: string | number) =>
    `/production-orders/${id}/environment-checks`,
  environmentCheckDetail: (checkId: string | number) =>
    `/production-orders/environment-checks/${checkId}`,
  lineClearanceChecks: (id: string | number) =>
    `/production-orders/${id}/line-clearance-checks`,
  lineClearanceCheckDetail: (checkId: string | number) =>
    `/production-orders/line-clearance-checks/${checkId}`,
  secondaryPackagingChecks: (id: string | number) =>
    `/production-orders/${id}/secondary-packaging-checks`,
  secondaryPackagingCheckDetail: (checkId: string | number) =>
    `/production-orders/secondary-packaging-checks/${checkId}`,
  preSecondaryPackagingChecks: (id: string | number) =>
    `/production-orders/${id}/pre-secondary-packaging-checks`,
  preSecondaryPackagingCheckDetail: (checkId: string | number) =>
    `/production-orders/pre-secondary-packaging-checks/${checkId}`,
  preSecondaryPackagingCheckImages: (checkId: string | number) =>
    `/production-orders/pre-secondary-packaging-checks/${checkId}/images`,
  preSecondaryPackagingCheckImageDetail: (imageId: string | number) =>
    `/production-orders/pre-secondary-packaging-checks/images/${imageId}`,
  preSecondaryPackagingCheckImageFile: (filename: string) =>
    `/production-orders/pre-secondary-packaging-checks/images/${encodeURIComponent(filename)}`,
  hygieneChecks: (id: string | number) =>
    `/production-orders/${id}/hygiene-checks`,
  hygieneCheckDetail: (checkId: string | number) =>
    `/production-orders/hygiene-checks/${checkId}`,
  steamSterilizationChecks: (id: string | number) =>
    `/production-orders/${id}/steam-sterilization-checks`,
  steamSterilizationCheckDetail: (checkId: string | number) =>
    `/production-orders/steam-sterilization-checks/${checkId}`,
  filtrationChecks: (id: string | number) =>
    `/production-orders/${id}/filtration-checks`,
  filtrationCheckDetail: (checkId: string | number) =>
    `/production-orders/filtration-checks/${checkId}`,
  densityChecks: (id: string | number) =>
    `/production-orders/${id}/density-checks`,
  densityCheckDetail: (checkId: string | number) =>
    `/production-orders/density-checks/${checkId}`,
  postHomogenizationGranuleChecks: (id: string | number) =>
    `/production-orders/${id}/post-homogenization-granule-checks`,
  postHomogenizationGranuleCheckDetail: (checkId: string | number) =>
    `/production-orders/post-homogenization-granule-checks/${checkId}`,
  postHomogenizationGranuleCheckImage: (filename: string) =>
    `/production-orders/post-homogenization-granule-checks/images/${filename}`,
  postPreparationSolutionChecks: (id: string | number) =>
    `/production-orders/${id}/post-preparation-solution-checks`,
  postPreparationSolutionCheckDetail: (checkId: string | number) =>
    `/production-orders/post-preparation-solution-checks/${checkId}`,
  postPreparationSolutionCheckImage: (filename: string) =>
    `/production-orders/post-preparation-solution-checks/images/${filename}`,
  friabilityChecks: (id: string | number) =>
    `/production-orders/${id}/friability-checks`,
  friabilityCheckDetail: (checkId: string | number) =>
    `/production-orders/friability-checks/${checkId}`,
  disintegrationChecks: (id: string | number) =>
    `/production-orders/${id}/disintegration-checks`,
  disintegrationCheckDetail: (checkId: string | number) =>
    `/production-orders/disintegration-checks/${checkId}`,
  vialInspectionChecks: (id: string | number) =>
    `/production-orders/${id}/vial-inspection-checks`,
  vialInspectionCheckDetail: (checkId: string | number) =>
    `/production-orders/vial-inspection-checks/${checkId}`,
  sensoryChecks: (id: string | number) =>
    `/production-orders/${id}/sensory-checks`,
  sensoryCheckDetail: (checkId: string | number) =>
    `/production-orders/sensory-checks/${checkId}`,
  sensoryCheckImages: (checkId: string | number) =>
    `/production-orders/sensory-checks/${checkId}/images`,
  primaryPackagingConfirmations: (id: string | number) =>
    `/production-orders/${id}/primary-packaging-confirmations`,
  primaryPackagingConfirmationDetail: (confirmationId: string | number) =>
    `/production-orders/primary-packaging-confirmations/${confirmationId}`,
  productSensoryChecks: (id: string | number) =>
    `/production-orders/${id}/ten-unit-sensory-checks`,
  productSensoryCheckDetail: (checkId: string | number) =>
    `/production-orders/ten-unit-sensory-checks/${checkId}`,
  productSensoryCheckImages: (checkId: string | number) =>
    `/production-orders/ten-unit-sensory-checks/${checkId}/images`,
  productSensoryCheckImage: (imageId: string | number) =>
    `/production-orders/ten-unit-sensory-checks/images/${imageId}`,
  productSensoryCheckImageFile: (filename: string) =>
    `/production-orders/ten-unit-sensory-checks/images/${encodeURIComponent(filename)}`,
  hardCapsuleLeakageChecks: (id: string | number) =>
    `/production-orders/${id}/hard-capsule-leakage-checks`,
  hardCapsuleLeakageCheckDetail: (checkId: string | number) =>
    `/production-orders/hard-capsule-leakage-checks/${checkId}`,
  leakTightnessChecks: (id: string | number) =>
    `/production-orders/${id}/leak-tightness-checks`,
  leakTightnessCheckDetail: (checkId: string | number) =>
    `/production-orders/leak-tightness-checks/${checkId}`,
  bottleVolumeChecks: (id: string | number) =>
    `/production-orders/${id}/bottle-volume-checks`,
  bottleVolumeCheckDetail: (checkId: string | number) =>
    `/production-orders/bottle-volume-checks/${checkId}`,
  volumeChecks: (id: string | number) =>
    `/production-orders/${id}/volume-checks`,
  volumeCheckDetail: (checkId: string | number) =>
    `/production-orders/volume-checks/${checkId}`,
  volumeCheckImages: (checkId: string | number) =>
    `/production-orders/volume-checks/${checkId}/images`,
  volumeCheckImage: (imageId: string | number) =>
    `/production-orders/volume-checks/images/${imageId}`,
  volumeCheckImageFile: (filename: string) =>
    `/production-orders/volume-checks/images/${encodeURIComponent(filename)}`,
  sprayDoseChecks: (id: string | number) =>
    `/production-orders/${id}/spray-dose-checks`,
  sprayDoseCheckDetail: (checkId: string | number) =>
    `/production-orders/spray-dose-checks/${checkId}`,
  hardnessChecks: (id: string | number) =>
    `/production-orders/${id}/hardness-checks`,
  hardnessCheckDetail: (checkId: string | number) =>
    `/production-orders/hardness-checks/${checkId}`,
  tabletThicknessChecks: (id: string | number) =>
    `/production-orders/${id}/tablet-thickness-checks`,
  tabletThicknessCheckDetail: (checkId: string | number) =>
    `/production-orders/tablet-thickness-checks/${checkId}`,
  semiFinishedGrossWeightChecks: (id: string | number) =>
    `/production-orders/${id}/semi-finished-gross-weight-checks`,
  semiFinishedGrossWeightCheckDetail: (checkId: string | number) =>
    `/production-orders/semi-finished-gross-weight-checks/${checkId}`,
  semiFinishedNetWeightChecks: (id: string | number) =>
    `/production-orders/${id}/semi-finished-net-weight-checks`,
  semiFinishedNetWeightCheckDetail: (checkId: string | number) =>
    `/production-orders/semi-finished-net-weight-checks/${checkId}`,
  shellWeightChecks: (id: string | number) =>
    `/production-orders/${id}/shell-weight-checks`,
  shellWeightCheckDetail: (checkId: string | number) =>
    `/production-orders/shell-weight-checks/${checkId}`,
  tenShellWeightCheck: (id: string | number) =>
    `/production-orders/${id}/ten-shell-weight-check`,
  tenShellWeightCheckDetail: (checkId: string | number) =>
    `/production-orders/ten-shell-weight-checks/${checkId}`,
  dateChecks: (id: string | number) => `/production-orders/${id}/date-checks`,
  dateCheckDetail: (checkId: string | number) =>
    `/production-orders/date-checks/${checkId}`,
  dateCheckApproval: (checkId: string | number) =>
    `/production-orders/date-checks/${checkId}/approval`,
  dateCheckImages: (checkId: string | number) =>
    `/production-orders/date-checks/${checkId}/images`,
  dateCheckImage: (imageId: string | number) =>
    `/production-orders/date-checks/images/${imageId}`,
  attachments: (id: string | number) =>
    `/production-orders/${id}/attachments`,
  attachmentDetail: (attachmentId: string | number) =>
    `/production-orders/attachments/${attachmentId}`,
  attachmentApproval: (attachmentId: string | number) =>
    `/production-orders/attachments/${attachmentId}/approval`,
  attachmentFiles: (attachmentId: string | number) =>
    `/production-orders/attachments/${attachmentId}/files`,
  attachmentFile: (fileId: string | number) =>
    `/production-orders/attachments/files/${fileId}`,
  finishedProductSummaries: "/production-orders/finished-product-summaries",
  finishedProductSummary: (id: string | number) =>
    `/production-orders/${id}/finished-product-summaries`,
  finishedProductSummaryDetail: (summaryId: string | number) =>
    `/production-orders/finished-product-summaries/${summaryId}`,
  semiFinishedProductSummaries: (id: string | number) =>
    `/production-orders/${id}/semi-finished-product-summaries`,
  semiFinishedProductSummaryDetail: (summaryId: string | number) =>
    `/production-orders/semi-finished-product-summaries/${summaryId}`,
  postSecondaryPackagingSummaries: (id: string | number) =>
    `/production-orders/${id}/post-secondary-packaging-summaries`,
  postSecondaryPackagingSummaryDetail: (summaryId: string | number) =>
    `/production-orders/post-secondary-packaging-summaries/${summaryId}`,
  postSecondaryPackagingPendingProcessItems: (summaryId: string | number) =>
    `/production-orders/post-secondary-packaging-summaries/${summaryId}/pending-process-items`,
  postSecondaryPackagingPendingProcessItemDetail: (itemId: string | number) =>
    `/production-orders/post-secondary-packaging-pending-process-items/${itemId}`,
  postSecondaryPackagingPendingCancellationItems: (
    summaryId: string | number,
  ) =>
    `/production-orders/post-secondary-packaging-summaries/${summaryId}/pending-cancellation-items`,
  postSecondaryPackagingPendingCancellationItemDetail: (
    itemId: string | number,
  ) =>
    `/production-orders/post-secondary-packaging-pending-cancellation-items/${itemId}`,
  documentControl: (id: string | number) =>
    `/production-orders/${id}/document-control`,
  issueBatchRecord: (id: string | number) =>
    `/production-orders/${id}/document-control/issue-batch-record`,
  receiveBatchRecord: (id: string | number) =>
    `/production-orders/${id}/document-control/receive-batch-record`,
  receiveTestCertificate: (id: string | number) =>
    `/production-orders/${id}/document-control/receive-test-certificate`,
  receiveWarehouseRelease: (id: string | number) =>
    `/production-orders/${id}/document-control/receive-warehouse-release`,
  productionGuide: (id: string | number) =>
    `/production-orders/${id}/production-guide`,
  productionGuideFile: (id: string | number) =>
    `/production-orders/${id}/production-guide/file`,
  materialSummaries: (id: string | number) =>
    `/production-orders/${id}/material-summaries`,
  materialSummaryDetail: (summaryId: string | number) =>
    `/production-orders/material-summaries/${summaryId}`,
  materialProcessSummaries: (id: string | number) =>
    `/production-orders/${id}/material-process-summaries`,
  materialProcessSummaryDetail: (summaryId: string | number) =>
    `/production-orders/material-process-summaries/${summaryId}`,
  materialProcessSummaryImage: (filename: string) =>
    `/production-orders/material-process-summaries/images/${filename}`,
  factoryReleaseReviews: (id: string | number) =>
    `/production-orders/${id}/factory-release-reviews`,
  factoryReleaseReviewDetail: (reviewId: string | number) =>
    `/production-orders/factory-release-reviews/${reviewId}`,
  samplingRecords: (id: string | number) =>
    `/production-orders/${id}/sampling-records`,
  samplingRecordDetail: (recordId: string | number) =>
    `/production-orders/sampling-records/${recordId}`,
  disinfectantPreparations: (id: string | number) =>
    `/production-orders/${id}/disinfectant-preparations`,
  disinfectantPreparationDetail: (preparationId: string | number) =>
    `/production-orders/disinfectant-preparations/${preparationId}`,
  cylinderCalibration: (id: string | number) =>
    `/production-orders/${id}/cylinder-calibration`,
};

const PRODUCTION_SPECIFICATIONS = {
  base: "/production-specifications",
};

const PRODUCTION_ORDER_DEVIATIONS = {
  base: "/production-order-deviations",
  images: "/production-order-deviations/images",
};

const FEATURES = {
  base: "/features",
  byKey: (key: string) => `/features/key/${encodeURIComponent(key)}`,
  item: (itemCode: string) => `/features/items/${encodeURIComponent(itemCode)}`,
  itemConfig: (itemCode: string) =>
    `/features/items/${encodeURIComponent(itemCode)}/config`,
  copyItemConfig: (itemCode: string) =>
    `/features/items/${encodeURIComponent(itemCode)}/copy`,
};

const PRODUCT_LINES = {
  base: "/product-lines",
  byCode: (code: string) => `/product-lines/code/${encodeURIComponent(code)}`,
};

const FILTER_CATALOGS = {
  base: "/filter-catalogs",
  detail: (id: string | number) => `/filter-catalogs/${id}`,
};

const PRODUCTION_WORKSHOPS = {
  base: "/production-workshops",
  pressureDifferentials: (id: string | number) =>
    `/production-workshops/${id}/pressure-differentials`,
  pressureDifferentialDetail: (pressureDifferentialId: string | number) =>
    `/production-workshops/pressure-differentials/${pressureDifferentialId}`,
  cleaningChecklists: (id: string | number) =>
    `/production-workshops/${id}/cleaning-checklists`,
  cleaningChecklistDetail: (cleaningChecklistId: string | number) =>
    `/production-workshops/cleaning-checklists/${cleaningChecklistId}`,
};

const EQUIPMENT = {
  base: "/equipment",
  detail: (id: string | number) => `/equipment/${id}`,
  parameters: (id: string | number) => `/equipment/${id}/parameters`,
  parameterDetail: (parameterId: string | number) =>
    `/equipment/parameters/${parameterId}`,
  monitoringRecords: "/equipment/monitoring-records",
  monitoringRecordDetail: (recordId: string | number) =>
    `/equipment/monitoring-records/${recordId}`,
  monitoringRecordImages: (recordId: string | number) =>
    `/equipment/monitoring-records/${recordId}/images`,
};

const CLEANING_OBJECTS = {
  base: "/cleaning-objects",
  detail: (id: string | number) => `/cleaning-objects/${id}`,
  byQrCode: (qrCode: string) =>
    `/cleaning-objects/qr/${encodeURIComponent(qrCode)}`,
};

const CLEANING_REQUIREMENTS = {
  base: "/cleaning-requirements",
  detail: (id: string | number) => `/cleaning-requirements/${id}`,
};

const SECONDARY_PACKAGING_STAGE_REQUIREMENTS = {
  base: "/secondary-packaging-stage-requirements",
  detail: (id: string | number) =>
    `/secondary-packaging-stage-requirements/${id}`,
};

const DOSAGE_FORMS = {
  base: "/dosage-forms",
  detail: (id: string | number) => `/dosage-forms/${id}`,
};

export const API_ROUTES = {
  auth: AUTH,
  users: USERS,
  internal: INTERNAL,
  departments: DEPARTMENT,
  companies: COMPANY,
  items: ITEMS,
  productionOrders: PRODUCTION_ORDERS,
  productionSpecifications: PRODUCTION_SPECIFICATIONS,
  productionOrderDeviations: PRODUCTION_ORDER_DEVIATIONS,
  features: FEATURES,
  productLines: PRODUCT_LINES,
  filterCatalogs: FILTER_CATALOGS,
  registrationNumbers: REGISTRATION_NUMBERS,
  productionWorkshops: PRODUCTION_WORKSHOPS,
  equipment: EQUIPMENT,
  cleaningObjects: CLEANING_OBJECTS,
  cleaningRequirements: CLEANING_REQUIREMENTS,
  secondaryPackagingStageRequirements:
    SECONDARY_PACKAGING_STAGE_REQUIREMENTS,
  dosageForms: DOSAGE_FORMS,
};
