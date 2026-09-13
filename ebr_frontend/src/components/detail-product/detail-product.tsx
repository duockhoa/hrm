"use client";

import { API_ROUTES } from "@/lib/api-routes";
import {
  dosageFormsService,
  productionSpecificationsService,
} from "@/services/index.service";
import useSWR from "swr";
import FieldDisplay from "../field-display/field-display";
import { Skeleton } from "../ui/skeleton";

function ProductDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="mx-auto h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

const formatValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const formatUpdatedBy = (
  updatedBy:
    | {
        name?: string | null;
        username?: string | null;
        email?: string | null;
        id?: number | string | null;
      }
    | null
    | undefined,
) => {
  if (!updatedBy) {
    return "";
  }

  return updatedBy.name ?? updatedBy.username ?? updatedBy.email ?? "";
};

const formatRegistration = (registration: any) => {
  if (!registration) {
    return "";
  }

  return [registration.registration_number, registration.product_name]
    .filter(Boolean)
    .join(" - ");
};

const formatSpecificationLimit = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
  operator?: string | number | null,
) => {
  const formattedValue = formatValue(value);

  if (!formattedValue) {
    return "";
  }

  return [operator, formattedValue, unit].filter(Boolean).join(" ");
};

const formatSprayDoseLimit = (
  value: string | number | null | undefined,
) => formatSpecificationLimit(value, "dose");

const formatFilmCoatedTabletWeightLimit = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
) => formatSpecificationLimit(value, unit);

const formatHardnessLimit = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
) => formatSpecificationLimit(value, unit || "N");

const buildFilmCoatedTabletWeightRequirement = (
  productionSpecification: any,
) => {
  const unit = productionSpecification?.film_coated_tablet_weight_unit;
  const lowerControlLimit = formatFilmCoatedTabletWeightLimit(
    productionSpecification?.film_coated_tablet_weight_lower_control_limit,
    unit,
  );
  const upperControlLimit = formatFilmCoatedTabletWeightLimit(
    productionSpecification?.film_coated_tablet_weight_upper_control_limit,
    unit,
  );
  const lowerAllowedLimit = formatFilmCoatedTabletWeightLimit(
    productionSpecification?.film_coated_tablet_weight_lower_allowed_limit,
    unit,
  );
  const upperAllowedLimit = formatFilmCoatedTabletWeightLimit(
    productionSpecification?.film_coated_tablet_weight_upper_allowed_limit,
    unit,
  );

  const formatRange = (label: string, lowerValue: string, upperValue: string) =>
    [
      label,
      lowerValue ? `từ ${lowerValue}` : "",
      upperValue ? `đến ${upperValue}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  const controlRange =
    lowerControlLimit || upperControlLimit
      ? formatRange("Kiểm soát", lowerControlLimit, upperControlLimit)
      : "";
  const allowedRange =
    lowerAllowedLimit || upperAllowedLimit
      ? formatRange("Cho phép", lowerAllowedLimit, upperAllowedLimit)
      : "";

  return [controlRange, allowedRange].filter(Boolean).join("\n");
};

const formatPairRange = (lowerValue?: string, upperValue?: string) => {
  if (lowerValue && upperValue) {
    if (lowerValue === upperValue) return lowerValue;
    return `${lowerValue} – ${upperValue}`;
  }
  return lowerValue || upperValue || "—";
};

function ProductDosageFormField({
  dosageFormId,
  dosageFormName,
}: {
  dosageFormId?: string | number | null;
  dosageFormName?: string | null;
}) {
  const hasDosageFormId =
    dosageFormId !== null && dosageFormId !== undefined && dosageFormId !== "";
  const { data, error, isLoading } = useSWR(
    hasDosageFormId ? API_ROUTES.dosageForms.detail(dosageFormId) : null,
    () => dosageFormsService.fetchById(dosageFormId as string | number),
  );
  const value = data?.name
    ? data.name
    : hasDosageFormId && isLoading
      ? "Đang tải..."
      : error
        ? "Không thể tải dạng bào chế"
        : dosageFormName ?? "";

  return <FieldDisplay lable="Dạng bào chế" value={value} />;
}

export default function ProductDetail({
  product,
  showDosageForm = true,
}: {
  product: any;
  showDosageForm?: boolean;
}) {
  const itemCode = product?.item_code;
  const { data: fetchedProductionSpecification } = useSWR(
    itemCode
      ? `${API_ROUTES.productionSpecifications.base}/${encodeURIComponent(String(itemCode))}`
      : null,
    () =>
      productionSpecificationsService.fetchProductionSpecificationByItemCode(
        String(itemCode),
      ),
  );

  if (!product) {
    return <ProductDetailSkeleton />;
  }

  const productionSpecification =
    fetchedProductionSpecification ?? product?.productionSpecification;
  const dosageFormId =
    productionSpecification?.dosage_form_id ??
    productionSpecification?.dosageForm?.id;
  const dosageFormName =
    productionSpecification?.dosageForm?.name ??
    productionSpecification?.dosage_form;
  const productLine = productionSpecification?.productLine;
  const productLineValue = productLine
    ? [productLine.code, productLine.name].filter(Boolean).join(" - ")
    : productionSpecification?.product_line;
  const updatedBy = formatUpdatedBy(productionSpecification?.updatedBy);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4 rounded border bg-white p-4 text-center shadow-md">
      <h1 className="text-4xl font-bold text-blue-500">
        {product?.item_code} - {product?.item_name}
      </h1>
      <div className="border-t border-gray-300 py-2" />

      <div className="flex flex-col gap-4">
        <FieldDisplay lable="Mã hàng hóa" value={product?.item_code} />
        <FieldDisplay lable="Tên hàng hóa" value={product?.item_name} />
        <FieldDisplay lable="Đơn vị tính" value={product?.unit} />
        <FieldDisplay
          lable="Số đăng ký"
          value={formatRegistration(product?.registration)}
        />
        {showDosageForm ? (
          <ProductDosageFormField
            dosageFormId={dosageFormId}
            dosageFormName={dosageFormName}
          />
        ) : null}
      </div>

      {productionSpecification ? (
        <>
          <div className="border-t border-gray-300 py-2" />
          <div className="flex flex-col gap-4">
            <h2 className="text-left text-xl font-semibold text-gray-800">
              Thông tin hàng hóa
            </h2>
            <FieldDisplay
              lable="Dòng sản phẩm"
              value={formatValue(productLineValue)}
            />

            <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border-b border-gray-200 px-4 py-2.5 font-semibold">
                      Chỉ tiêu kiểm tra
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2.5 font-semibold">
                      Giới hạn kiểm soát
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2.5 font-semibold">
                      Giới hạn cho phép
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const specRows = [
                      {
                        name: "Giới hạn đóng gói (Thể tích / Khối lượng)",
                        control: formatPairRange(
                          formatSpecificationLimit(
                            productionSpecification.lower_control_limit,
                            productionSpecification.unit,
                            productionSpecification.lower_control_limit_operator,
                          ),
                          formatSpecificationLimit(
                            productionSpecification.upper_control_limit,
                            productionSpecification.unit,
                            productionSpecification.upper_control_limit_operator,
                          ),
                        ),
                        allowed: formatPairRange(
                          formatSpecificationLimit(
                            productionSpecification.lower_allowed_limit,
                            productionSpecification.unit,
                            productionSpecification.lower_allowed_limit_operator,
                          ),
                          formatSpecificationLimit(
                            productionSpecification.upper_allowed_limit,
                            productionSpecification.unit,
                            productionSpecification.upper_allowed_limit_operator,
                          ),
                        ),
                      },
                      {
                        name: "Số liều xịt",
                        control: formatPairRange(
                          formatSprayDoseLimit(
                            productionSpecification.spray_dose_lower_control_limit,
                          ),
                          formatSprayDoseLimit(
                            productionSpecification.spray_dose_upper_control_limit,
                          ),
                        ),
                        allowed: formatPairRange(
                          formatSprayDoseLimit(
                            productionSpecification.spray_dose_lower_allowed_limit,
                          ),
                          formatSprayDoseLimit(
                            productionSpecification.spray_dose_upper_allowed_limit,
                          ),
                        ),
                      },
                      {
                        name: "Khối lượng viên nén bao phim",
                        control: formatPairRange(
                          formatFilmCoatedTabletWeightLimit(
                            productionSpecification.film_coated_tablet_weight_lower_control_limit,
                            productionSpecification.film_coated_tablet_weight_unit,
                          ),
                          formatFilmCoatedTabletWeightLimit(
                            productionSpecification.film_coated_tablet_weight_upper_control_limit,
                            productionSpecification.film_coated_tablet_weight_unit,
                          ),
                        ),
                        allowed: formatPairRange(
                          formatFilmCoatedTabletWeightLimit(
                            productionSpecification.film_coated_tablet_weight_lower_allowed_limit,
                            productionSpecification.film_coated_tablet_weight_unit,
                          ),
                          formatFilmCoatedTabletWeightLimit(
                            productionSpecification.film_coated_tablet_weight_upper_allowed_limit,
                            productionSpecification.film_coated_tablet_weight_unit,
                          ),
                        ),
                      },
                      {
                        name: "Độ cứng viên",
                        control: formatPairRange(
                          formatHardnessLimit(
                            productionSpecification.hardness_lower_control_limit,
                            productionSpecification.hardness_unit,
                          ),
                          formatHardnessLimit(
                            productionSpecification.hardness_upper_control_limit,
                            productionSpecification.hardness_unit,
                          ),
                        ),
                        allowed: formatPairRange(
                          formatHardnessLimit(
                            productionSpecification.hardness_lower_allowed_limit,
                            productionSpecification.hardness_unit,
                          ),
                          formatHardnessLimit(
                            productionSpecification.hardness_upper_allowed_limit,
                            productionSpecification.hardness_unit,
                          ),
                        ),
                      },
                      {
                        name: "Độ dày viên",
                        control:
                          formatSpecificationLimit(
                            productionSpecification.tablet_thickness_control_limit,
                            productionSpecification.tablet_thickness_unit || "mm",
                          ) || "—",
                        allowed:
                          formatSpecificationLimit(
                            productionSpecification.tablet_thickness_allowed_limit,
                            productionSpecification.tablet_thickness_unit || "mm",
                          ) || "—",
                      },
                      {
                        name: "Thời gian rã",
                        control:
                          formatSpecificationLimit(
                            productionSpecification.disintegration_time_control_limit,
                            productionSpecification.disintegration_time_unit ||
                              "phút",
                          ) || "—",
                        allowed:
                          formatSpecificationLimit(
                            productionSpecification.disintegration_time_allowed_limit,
                            productionSpecification.disintegration_time_unit ||
                              "phút",
                          ) || "—",
                      },
                    ];

                    const activeSpecRows = specRows.filter(
                      (row) => row.control !== "—" || row.allowed !== "—",
                    );

                    return activeSpecRows.length > 0 ? (
                      activeSpecRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="bg-slate-50/50 px-4 py-2 font-medium text-gray-900">
                            {row.name}
                          </td>
                          <td className="px-4 py-2 text-gray-700">
                            {row.control}
                          </td>
                          <td className="px-4 py-2 text-gray-700">
                            {row.allowed}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-4 text-center italic text-gray-500"
                        >
                          Chưa thiết lập tiêu chuẩn kỹ thuật
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {updatedBy ? (
              <FieldDisplay lable="Cập nhật bởi" value={updatedBy} />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
