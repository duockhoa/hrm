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
            <FieldDisplay
              lable="Giới hạn kiểm soát dưới"
              value={formatSpecificationLimit(
                productionSpecification.lower_control_limit,
                productionSpecification.unit,
                productionSpecification.lower_control_limit_operator,
              )}
            />
            <FieldDisplay
              lable="Giới hạn kiểm soát trên"
              value={formatSpecificationLimit(
                productionSpecification.upper_control_limit,
                productionSpecification.unit,
                productionSpecification.upper_control_limit_operator,
              )}
            />
            <FieldDisplay
              lable="Giới hạn cho phép dưới"
              value={formatSpecificationLimit(
                productionSpecification.lower_allowed_limit,
                productionSpecification.unit,
                productionSpecification.lower_allowed_limit_operator,
              )}
            />
            <FieldDisplay
              lable="Giới hạn cho phép trên"
              value={formatSpecificationLimit(
                productionSpecification.upper_allowed_limit,
                productionSpecification.unit,
                productionSpecification.upper_allowed_limit_operator,
              )}
            />
            <FieldDisplay
              lable="Số liều xịt kiểm soát dưới"
              value={formatSprayDoseLimit(
                productionSpecification.spray_dose_lower_control_limit,
              )}
            />
            <FieldDisplay
              lable="Số liều xịt kiểm soát trên"
              value={formatSprayDoseLimit(
                productionSpecification.spray_dose_upper_control_limit,
              )}
            />
            <FieldDisplay
              lable="Số liều xịt cho phép dưới"
              value={formatSprayDoseLimit(
                productionSpecification.spray_dose_lower_allowed_limit,
              )}
            />
            <FieldDisplay
              lable="Số liều xịt cho phép trên"
              value={formatSprayDoseLimit(
                productionSpecification.spray_dose_upper_allowed_limit,
              )}
            />
            <FieldDisplay
              lable="Khối lượng viên nén bao phim kiểm soát dưới"
              value={formatFilmCoatedTabletWeightLimit(
                productionSpecification.film_coated_tablet_weight_lower_control_limit,
                productionSpecification.film_coated_tablet_weight_unit,
              )}
            />
            <FieldDisplay
              lable="Khối lượng viên nén bao phim kiểm soát trên"
              value={formatFilmCoatedTabletWeightLimit(
                productionSpecification.film_coated_tablet_weight_upper_control_limit,
                productionSpecification.film_coated_tablet_weight_unit,
              )}
            />
            <FieldDisplay
              lable="Khối lượng viên nén bao phim cho phép dưới"
              value={formatFilmCoatedTabletWeightLimit(
                productionSpecification.film_coated_tablet_weight_lower_allowed_limit,
                productionSpecification.film_coated_tablet_weight_unit,
              )}
            />
            <FieldDisplay
              lable="Khối lượng viên nén bao phim cho phép trên"
              value={formatFilmCoatedTabletWeightLimit(
                productionSpecification.film_coated_tablet_weight_upper_allowed_limit,
                productionSpecification.film_coated_tablet_weight_unit,
              )}
            />
            <FieldDisplay
              lable="Yêu cầu khối lượng viên nén bao phim"
              value={buildFilmCoatedTabletWeightRequirement(
                productionSpecification,
              )}
            />
            <FieldDisplay
              lable="Độ cứng kiểm soát dưới"
              value={formatHardnessLimit(
                productionSpecification.hardness_lower_control_limit,
                productionSpecification.hardness_unit,
              )}
            />
            <FieldDisplay
              lable="Độ cứng kiểm soát trên"
              value={formatHardnessLimit(
                productionSpecification.hardness_upper_control_limit,
                productionSpecification.hardness_unit,
              )}
            />
            <FieldDisplay
              lable="Độ cứng cho phép dưới"
              value={formatHardnessLimit(
                productionSpecification.hardness_lower_allowed_limit,
                productionSpecification.hardness_unit,
              )}
            />
            <FieldDisplay
              lable="Độ cứng cho phép trên"
              value={formatHardnessLimit(
                productionSpecification.hardness_upper_allowed_limit,
                productionSpecification.hardness_unit,
              )}
            />
            <FieldDisplay
              lable="Độ dày kiểm soát"
              value={formatSpecificationLimit(
                productionSpecification.tablet_thickness_control_limit,
                productionSpecification.tablet_thickness_unit || "mm",
              )}
            />
            <FieldDisplay
              lable="Độ dày cho phép"
              value={formatSpecificationLimit(
                productionSpecification.tablet_thickness_allowed_limit,
                productionSpecification.tablet_thickness_unit || "mm",
              )}
            />
            <FieldDisplay
              lable="Thời gian rã kiểm soát"
              value={formatSpecificationLimit(
                productionSpecification.disintegration_time_control_limit,
                productionSpecification.disintegration_time_unit || "phút",
              )}
            />
            <FieldDisplay
              lable="Thời gian rã cho phép"
              value={formatSpecificationLimit(
                productionSpecification.disintegration_time_allowed_limit,
                productionSpecification.disintegration_time_unit || "phút",
              )}
            />
            {updatedBy ? (
              <FieldDisplay lable="Cập nhật bởi" value={updatedBy} />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
