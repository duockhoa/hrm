"use client";

import {
  DETAIL_COMPONENTS,
  HeaderDetailProductOrder,
  ProductOrderDetail,
  PRODUCTION_ORDER_DETAIL_TYPES,
  type ProductionOrderDetailSelection,
} from "@/features/production-orders";
import { InlineProductionOrderDeviations } from "@/features/production-order-deviations";
import { InlineProductionOrderEnvironmentChecks } from "@/features/production-order-environment-checks";
import { InlineProductionOrderLineClearanceChecks } from "@/features/production-order-line-clearance-checks";
import { InlineProductionOrderSecondaryPackagingChecks } from "@/features/production-order-secondary-packaging-checks";
import { InlinePreSecondaryPackagingChecks } from "@/features/production-order-pre-secondary-packaging-checks";
import { InlineProductionOrderHygieneChecks } from "@/features/production-order-hygiene-checks";
import { InlineProductionOrderDensityChecks } from "@/features/production-order-density-checks";
import { InlineProductionOrderPostHomogenizationGranuleChecks } from "@/features/production-order-post-homogenization-granule-checks";
import { InlineProductionOrderPostPreparationSolutionChecks } from "@/features/production-order-post-preparation-solution-checks";
import { InlineProductionOrderFriabilityChecks } from "@/features/production-order-friability-checks";
import { InlineProductionOrderDisintegrationChecks } from "@/features/production-order-disintegration-checks";
import { InlineProductionOrderVialInspectionChecks } from "@/features/production-order-vial-inspection-checks";
import { InlineProductionOrderSensoryChecks } from "@/features/production-order-sensory-checks";
import { InlineProductionOrderProductSensoryChecks } from "@/features/production-order-product-sensory-checks";
import { InlineProductionOrderHardCapsuleLeakageChecks } from "@/features/production-order-hard-capsule-leakage-checks";
import { InlineLeakTightnessChecks } from "@/features/production-order-leak-tightness-checks";
import { InlineProductionOrderVolumeChecks } from "@/features/production-order-volume-checks";
import { InlineProductionOrderSprayDoseChecks } from "@/features/production-order-spray-dose-checks";
import { InlineProductionOrderHardnessChecks } from "@/features/production-order-hardness-checks";
import { InlineProductionOrderTabletThicknessChecks } from "@/features/production-order-tablet-thickness-checks";
import { InlineProductionOrderSemiFinishedGrossWeightChecks } from "@/features/production-order-semi-finished-gross-weight-checks";
import { InlineProductionOrderSemiFinishedNetWeightChecks } from "@/features/production-order-semi-finished-net-weight-checks";
import { InlineProductionOrderShellWeightChecks } from "@/features/production-order-shell-weight-checks";
import { InlineProductionOrderTenShellWeightCheck } from "@/features/production-order-ten-shell-weight-checks";
import { InlineProductionOrderDateChecks } from "@/features/production-order-date-checks";
import { InlineProductionOrderCylinderCalibration } from "@/features/production-order-cylinder-calibrations";
import { InlineProductionOrderFinishedProductSummary } from "@/features/finished-product-summary";
import { InlineProductionOrderSemiFinishedProductSummaries } from "@/features/production-order-semi-finished-product-summaries";
import { InlineProductionOrderMaterialProcessSummaries } from "@/features/production-order-material-process-summaries";
import { InlineProductionOrderFactoryReleaseReviews } from "@/features/production-order-factory-release-reviews";
import { InlinePrimaryPackagingConfirmations } from "@/features/production-order-primary-packaging-confirmations";
import { InlineProductionOrderSamplingRecords } from "@/features/production-order-sampling-records";
import { InlineProductionOrderDisinfectantPreparations } from "@/features/production-order-disinfectant-preparations";
import { InlineProductionOrderAttachments } from "@/features/production-order-attachments";
import { InlineProductionOrderMixingRecord } from "@/features/production-order-mixing-records";
import { getEnabledProductionOrderFeatureKeys } from "@/features/features";
import {
  InlineMaterialSummarySection,
  InlineProductionOrderLines,
} from "@/features/production-order-lines";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { API_ROUTES } from "@/lib/api-routes";
import {
  productOrdersService,
  productionOrderDeviationsService,
} from "@/services/index.service";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import ProductOrdersPage from "../page";

export default function DetailProductOrderPage() {
  const params: any = useParams();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const [detailSelection, setDetailSelection] =
    useState<ProductionOrderDetailSelection | null>(null);
  const [showMixingRecord, setShowMixingRecord] = useState(false);
  const DetailComponent = detailSelection
    ? DETAIL_COMPONENTS[detailSelection.type]
    : null;

  const { data, error } = useSWR(
    `${API_ROUTES.productionOrders.base}/${params.id}`,
    () => productOrdersService.fetchProductionOrderById(params.id),
  );
  const enabledSectionKeys = getEnabledProductionOrderFeatureKeys(
    data?.featureConfig,
    "section",
    [
      "production_order_deviations",
      "environment_checks",
      "line_clearance_checks",
      "secondary_packaging_checks",
      "pre_secondary_packaging_checks",
      "hygiene_checks",
      "density_checks",
      "post_homogenization_granule_checks",
      "post_preparation_solution_checks",
      "friability_checks",
      "cylinder_calibration",
      "disintegration_checks",
      "vial_inspection_checks",
      "sensory_checks",
      "product_sensory_checks",
      "hard_capsule_leakage_checks",
      "leak_tightness_checks",
      "volume_checks",
      "shell_weight_checks",
      "ten_shell_weight_check",
      "spray_dose_checks",
      "hardness_checks",
      "tablet_thickness_checks",
      "semi_finished_gross_weight_checks",
      "semi_finished_net_weight_checks",
      "date_checks",
      "production_order_attachments",
      "finished_product_summary",
      "semi_finished_product_summaries",
      "material_process_summaries",
      "factory_release_reviews",
      "primary_packaging_confirmations",
      "sampling_records",
      "disinfectant_preparations",
      "material_summaries",
      "production_order_lines",
    ],
  );
  const shouldRenderDateChecks = enabledSectionKeys.includes("date_checks");
  const orderedSectionKeys = [
    ...enabledSectionKeys.filter(
      (sectionKey) =>
        sectionKey !== "date_checks" && sectionKey !== "production_order_lines",
    ),
    ...(enabledSectionKeys.includes("production_order_lines")
      ? ["production_order_lines"]
      : []),
  ];

  const { data: productionOrderLines } = useSWR(
    `${API_ROUTES.productionOrders.base}/${params.id}/production-order-lines`,
    () => productOrdersService.fetchProductionOrderLines(params.id),
  );

  const { data: productionOrderDeviations } = useSWR(
    `${API_ROUTES.productionOrderDeviations.base}?production_order_id=${params.id}`,
    () =>
      productionOrderDeviationsService.fetchProductionOrderDeviations(
        params.id,
      ),
  );

  const { data: productionOrderEnvironmentChecks } = useSWR(
    API_ROUTES.productionOrders.environmentChecks(params.id),
    () => productOrdersService.fetchEnvironmentChecks(params.id),
  );

  const { data: productionOrderLineClearanceChecks } = useSWR(
    API_ROUTES.productionOrders.lineClearanceChecks(params.id),
    () => productOrdersService.fetchLineClearanceChecks(params.id),
  );

  const { data: productionOrderSecondaryPackagingChecks } = useSWR(
    API_ROUTES.productionOrders.secondaryPackagingChecks(params.id),
    () => productOrdersService.fetchSecondaryPackagingChecks(params.id),
  );

  const { data: productionOrderPreSecondaryPackagingChecks } = useSWR(
    API_ROUTES.productionOrders.preSecondaryPackagingChecks(params.id),
    () => productOrdersService.fetchPreSecondaryPackagingChecks(params.id),
  );

  const { data: productionOrderHygieneChecks } = useSWR(
    API_ROUTES.productionOrders.hygieneChecks(params.id),
    () => productOrdersService.fetchHygieneChecks(params.id),
  );

  const { data: productionOrderDensityChecks } = useSWR(
    API_ROUTES.productionOrders.densityChecks(params.id),
    () => productOrdersService.fetchDensityChecks(params.id),
  );

  const { data: productionOrderPostHomogenizationGranuleChecks } = useSWR(
    API_ROUTES.productionOrders.postHomogenizationGranuleChecks(params.id),
    () => productOrdersService.fetchPostHomogenizationGranuleChecks(params.id),
  );

  const { data: productionOrderPostPreparationSolutionChecks } = useSWR(
    API_ROUTES.productionOrders.postPreparationSolutionChecks(params.id),
    () => productOrdersService.fetchPostPreparationSolutionChecks(params.id),
  );

  const { data: productionOrderFriabilityChecks } = useSWR(
    API_ROUTES.productionOrders.friabilityChecks(params.id),
    () => productOrdersService.fetchFriabilityChecks(params.id),
  );

  const { data: productionOrderCylinderCalibration } = useSWR(
    API_ROUTES.productionOrders.cylinderCalibration(params.id),
    () => productOrdersService.fetchCylinderCalibration(params.id),
  );

  const { data: productionOrderDisintegrationChecks } = useSWR(
    API_ROUTES.productionOrders.disintegrationChecks(params.id),
    () => productOrdersService.fetchDisintegrationChecks(params.id),
  );

  const { data: productionOrderVialInspectionChecks } = useSWR(
    API_ROUTES.productionOrders.vialInspectionChecks(params.id),
    () => productOrdersService.fetchVialInspectionChecks(params.id),
  );

  const { data: productionOrderSensoryChecks } = useSWR(
    API_ROUTES.productionOrders.sensoryChecks(params.id),
    () => productOrdersService.fetchSensoryChecks(params.id),
  );

  const { data: productionOrderProductSensoryChecks } = useSWR(
    API_ROUTES.productionOrders.productSensoryChecks(params.id),
    () => productOrdersService.fetchProductSensoryChecks(params.id),
  );

  const { data: productionOrderHardCapsuleLeakageChecks } = useSWR(
    API_ROUTES.productionOrders.hardCapsuleLeakageChecks(params.id),
    () => productOrdersService.fetchHardCapsuleLeakageChecks(params.id),
  );

  const { data: productionOrderLeakTightnessChecks } = useSWR(
    API_ROUTES.productionOrders.leakTightnessChecks(params.id),
    () => productOrdersService.fetchLeakTightnessChecks(params.id),
  );

  const { data: productionOrderVolumeChecks } = useSWR(
    API_ROUTES.productionOrders.volumeChecks(params.id),
    () => productOrdersService.fetchVolumeChecks(params.id),
  );

  const { data: productionOrderSprayDoseChecks } = useSWR(
    API_ROUTES.productionOrders.sprayDoseChecks(params.id),
    () => productOrdersService.fetchSprayDoseChecks(params.id),
  );

  const { data: productionOrderHardnessChecks } = useSWR(
    API_ROUTES.productionOrders.hardnessChecks(params.id),
    () => productOrdersService.fetchHardnessChecks(params.id),
  );

  const { data: productionOrderTabletThicknessChecks } = useSWR(
    API_ROUTES.productionOrders.tabletThicknessChecks(params.id),
    () => productOrdersService.fetchTabletThicknessChecks(params.id),
  );

  const { data: productionOrderSemiFinishedGrossWeightChecks } = useSWR(
    API_ROUTES.productionOrders.semiFinishedGrossWeightChecks(params.id),
    () => productOrdersService.fetchSemiFinishedGrossWeightChecks(params.id),
  );

  const { data: productionOrderSemiFinishedNetWeightChecks } = useSWR(
    API_ROUTES.productionOrders.semiFinishedNetWeightChecks(params.id),
    () => productOrdersService.fetchSemiFinishedNetWeightChecks(params.id),
  );

  const { data: productionOrderShellWeightChecks } = useSWR(
    API_ROUTES.productionOrders.shellWeightChecks(params.id),
    () => productOrdersService.fetchShellWeightChecks(params.id),
  );

  const { data: productionOrderTenShellWeightCheck } = useSWR(
    API_ROUTES.productionOrders.tenShellWeightCheck(params.id),
    () => productOrdersService.fetchTenShellWeightCheck(params.id),
  );

  const { data: productionOrderDateChecks } = useSWR(
    API_ROUTES.productionOrders.dateChecks(params.id),
    () => productOrdersService.fetchDateChecks(params.id),
  );

  const { data: productionOrderFinishedProductSummary } = useSWR(
    API_ROUTES.productionOrders.finishedProductSummary(params.id),
    () => productOrdersService.fetchFinishedProductSummary(params.id),
  );

  const { data: productionOrderAttachments } = useSWR(
    API_ROUTES.productionOrders.attachments(params.id),
    () => productOrdersService.fetchProductionOrderAttachments(params.id),
  );

  const { data: productionOrderSemiFinishedProductSummaries } = useSWR(
    API_ROUTES.productionOrders.semiFinishedProductSummaries(params.id),
    () => productOrdersService.fetchSemiFinishedProductSummaries(params.id),
  );

  const { data: productionOrderMaterialProcessSummaries } = useSWR(
    API_ROUTES.productionOrders.materialProcessSummaries(params.id),
    () => productOrdersService.fetchMaterialProcessSummaries(params.id),
  );

  const { data: productionOrderFactoryReleaseReviews } = useSWR(
    API_ROUTES.productionOrders.factoryReleaseReviews(params.id),
    () => productOrdersService.fetchFactoryReleaseReviews(params.id),
  );

  const { data: primaryPackagingConfirmations } = useSWR(
    API_ROUTES.productionOrders.primaryPackagingConfirmations(params.id),
    () => productOrdersService.fetchPrimaryPackagingConfirmations(params.id),
  );

  const { data: productionOrderSamplingRecords } = useSWR(
    API_ROUTES.productionOrders.samplingRecords(params.id),
    () => productOrdersService.fetchSamplingRecords(params.id),
  );

  const { data: productionOrderDisinfectantPreparations } = useSWR(
    API_ROUTES.productionOrders.disinfectantPreparations(params.id),
    () => productOrdersService.fetchDisinfectantPreparations(params.id),
  );

  if (error) {
    return <div>Không thể tải dữ liệu lô.</div>;
  }

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={isTablet ? 25 : 30}
            className="min-h-0 min-w-0 overflow-hidden"
            minSize={isTablet ? 20 : 30}
          >
            <ProductOrdersPage />
          </ResizablePanel>
        )}

        {!isMobile && <ResizableHandle />}

        <ResizablePanel
          defaultSize={isMobile ? 100 : isTablet ? 75 : 70}
          className="min-h-0 min-w-0 overflow-auto p-2 md:p-4"
          minSize={0}
        >
          {showMixingRecord ? (
            <div className="flex flex-col items-center rounded">
              <InlineProductionOrderMixingRecord
                productionOrder={data}
                onClose={() => setShowMixingRecord(false)}
              />
            </div>
          ) : detailSelection && DetailComponent ? (
            <div className="flex flex-col items-center rounded">
              <DetailComponent
                id={detailSelection.id}
                itemCode={detailSelection.itemCode}
                onClose={() => setDetailSelection(null)}
              />
            </div>
          ) : (
            <>
              <HeaderDetailProductOrder lot={data} />
              <div className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4">
                <ProductOrderDetail
                  productOrder={data}
                  productionOrderLines={productionOrderLines}
                  onOpenMixingRecord={() => {
                    setDetailSelection(null);
                    setShowMixingRecord(true);
                  }}
                  onOpenMaterialSummary={(productionOrderId) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.productionOrderLines,
                      id: productionOrderId,
                    })
                  }
                  onOpenEquipmentMonitoringRecord={(
                    productionOrderId,
                    itemCode,
                  ) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.equipmentMonitoringRecord,
                      id: productionOrderId,
                      itemCode,
                    })
                  }
                  onOpenSteamSterilizationChecks={(productionOrderId) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.steamSterilizationChecks,
                      id: productionOrderId,
                    })
                  }
                  onOpenDateChecks={(productionOrderId) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.dateChecks,
                      id: productionOrderId,
                    })
                  }
                  onOpenSteamSterilizationCheckDetail={(checkId) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.steamSterilizationCheck,
                      id: checkId,
                    })
                  }
                  onOpenFiltrationChecks={(productionOrderId) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.filtrationChecks,
                      id: productionOrderId,
                    })
                  }
                  onOpenFiltrationCheckDetail={(checkId) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.filtrationCheck,
                      id: checkId,
                    })
                  }
                  onOpenPostSecondaryPackagingSummaries={(productionOrderId) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.postSecondaryPackagingSummaries,
                      id: productionOrderId,
                    })
                  }
                  onOpenPostSecondaryPackagingSummaryDetail={(summaryId) =>
                    setDetailSelection({
                      type: PRODUCTION_ORDER_DETAIL_TYPES.postSecondaryPackagingSummary,
                      id: summaryId,
                    })
                  }
                />
              </div>
              {shouldRenderDateChecks ? (
                <div className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4">
                  <InlineProductionOrderDateChecks
                    data={productionOrderDateChecks}
                    selectedCheckId={null}
                    onSelectCheck={(checkId) =>
                      setDetailSelection({
                        type: PRODUCTION_ORDER_DETAIL_TYPES.dateCheck,
                        id: checkId,
                      })
                    }
                  />
                </div>
              ) : null}
              {orderedSectionKeys.map((sectionKey) => {
                if (sectionKey === "production_order_attachments") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderAttachments
                        data={productionOrderAttachments}
                        selectedAttachmentId={null}
                        onSelectAttachment={(attachmentId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.productionOrderAttachment,
                            id: attachmentId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "production_order_deviations") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderDeviations
                        data={productionOrderDeviations}
                        selectedDeviationId={null}
                        onSelectDeviation={(deviationId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.deviation,
                            id: deviationId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "environment_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderEnvironmentChecks
                        data={productionOrderEnvironmentChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.environmentCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "hygiene_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderHygieneChecks
                        data={productionOrderHygieneChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.hygieneCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "line_clearance_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderLineClearanceChecks
                        data={productionOrderLineClearanceChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.lineClearanceCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "density_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderDensityChecks
                        data={productionOrderDensityChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.densityCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "secondary_packaging_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderSecondaryPackagingChecks
                        data={productionOrderSecondaryPackagingChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.secondaryPackagingCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "post_homogenization_granule_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderPostHomogenizationGranuleChecks
                        data={productionOrderPostHomogenizationGranuleChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.postHomogenizationGranuleCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "pre_secondary_packaging_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlinePreSecondaryPackagingChecks
                        data={productionOrderPreSecondaryPackagingChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.preSecondaryPackagingCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "post_preparation_solution_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderPostPreparationSolutionChecks
                        data={productionOrderPostPreparationSolutionChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.postPreparationSolutionCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "friability_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderFriabilityChecks
                        data={productionOrderFriabilityChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.friabilityCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "cylinder_calibration") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderCylinderCalibration
                        data={productionOrderCylinderCalibration}
                        onSelect={(productionOrderId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.cylinderCalibration,
                            id: productionOrderId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "disintegration_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderDisintegrationChecks
                        data={productionOrderDisintegrationChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.disintegrationCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "vial_inspection_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderVialInspectionChecks
                        data={productionOrderVialInspectionChecks}
                        productionOrderId={params.id}
                        selectedCheckId={null}
                        selectedSummaryId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.vialInspectionCheck,
                            id: checkId,
                          })
                        }
                        onSelectSummary={(productionOrderId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.vialInspectionSummary,
                            id: productionOrderId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "hard_capsule_leakage_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderHardCapsuleLeakageChecks
                        data={productionOrderHardCapsuleLeakageChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.hardCapsuleLeakageCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "leak_tightness_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineLeakTightnessChecks
                        data={productionOrderLeakTightnessChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.leakTightnessCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "volume_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderVolumeChecks
                        data={productionOrderVolumeChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.volumeCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "sensory_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderSensoryChecks
                        data={productionOrderSensoryChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.sensoryCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "product_sensory_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderProductSensoryChecks
                        data={productionOrderProductSensoryChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.productSensoryCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "spray_dose_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderSprayDoseChecks
                        data={productionOrderSprayDoseChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.sprayDoseCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "hardness_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderHardnessChecks
                        data={productionOrderHardnessChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.hardnessCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "tablet_thickness_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderTabletThicknessChecks
                        data={productionOrderTabletThicknessChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.tabletThicknessCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "semi_finished_gross_weight_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderSemiFinishedGrossWeightChecks
                        data={productionOrderSemiFinishedGrossWeightChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.semiFinishedGrossWeightCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "semi_finished_net_weight_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderSemiFinishedNetWeightChecks
                        data={productionOrderSemiFinishedNetWeightChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.semiFinishedNetWeightCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "shell_weight_checks") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderShellWeightChecks
                        data={productionOrderShellWeightChecks}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.shellWeightCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "ten_shell_weight_check") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderTenShellWeightCheck
                        data={productionOrderTenShellWeightCheck}
                        selectedCheckId={null}
                        onSelectCheck={(checkId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.tenShellWeightCheck,
                            id: checkId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "finished_product_summary") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderFinishedProductSummary
                        data={productionOrderFinishedProductSummary}
                        selectedSummaryId={null}
                        onSelectSummary={(summaryId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.finishedProductSummary,
                            id: summaryId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "semi_finished_product_summaries") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderSemiFinishedProductSummaries
                        data={productionOrderSemiFinishedProductSummaries}
                        selectedSummaryId={null}
                        onSelectSummary={(summaryId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.semiFinishedProductSummary,
                            id: summaryId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "material_process_summaries") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderMaterialProcessSummaries
                        data={productionOrderMaterialProcessSummaries}
                        selectedSummaryId={null}
                        onSelectSummary={(summaryId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.materialProcessSummary,
                            id: summaryId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "factory_release_reviews") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderFactoryReleaseReviews
                        data={productionOrderFactoryReleaseReviews}
                        selectedReviewId={null}
                        onSelectReview={(reviewId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.factoryReleaseReview,
                            id: reviewId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "primary_packaging_confirmations") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlinePrimaryPackagingConfirmations
                        data={primaryPackagingConfirmations}
                        selectedConfirmationId={null}
                        onSelectConfirmation={(confirmationId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.primaryPackagingConfirmation,
                            id: confirmationId,
                          })
                        }
                      />
                    </div>
                  );
                }

                if (sectionKey === "sampling_records") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderSamplingRecords
                        data={productionOrderSamplingRecords}
                        selectedRecordId={null}
                        onSelectRecord={(recordId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.samplingRecord,
                            id: recordId,
                          })
                        }
                      />
                    </div>
                  );
                }
                if (sectionKey === "disinfectant_preparations") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderDisinfectantPreparations
                        data={productionOrderDisinfectantPreparations}
                        selectedPreparationId={null}
                        onSelectPreparation={(preparationId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.disinfectantPreparation,
                            id: preparationId,
                          })
                        }
                      />
                    </div>
                  );
                }
                if (sectionKey === "material_summaries") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineMaterialSummarySection
                        productionOrderId={params.id}
                        productionOrderLines={productionOrderLines}
                      />
                    </div>
                  );
                }
                if (sectionKey === "production_order_lines") {
                  return (
                    <div
                      key={sectionKey}
                      className="mt-2 flex flex-col items-center gap-2 rounded md:mt-4 md:gap-4"
                    >
                      <InlineProductionOrderLines
                        data={productionOrderLines}
                        productionOrderId={params.id}
                        selectedLineId={null}
                        onSelectLine={(lineId) =>
                          setDetailSelection({
                            type: PRODUCTION_ORDER_DETAIL_TYPES.productionOrderLine,
                            id: lineId,
                          })
                        }
                      />
                    </div>
                  );
                }

                return null;
              })}
            </>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
