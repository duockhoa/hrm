"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import userService from "@/services/user.service";
import type { ProductionOrderFactoryReleaseReview } from "../../types";

const testResultFields = [
  "raw_material_test_result",
  "water_test_result",
  "compressed_air_test_result",
  "filter_integrity_test_result",
  "packaging_inspection_result",
  "finished_product_test_result",
  "sterilization_result",
  "online_particle_result",
  "yield_quantity",
  "deviation",
  "environment_monitoring_result",
] as const;
const REGISTRATION_NUMBER_OPTIONS = ["Còn hiệu lực", "Hết hiệu lực"] as const;
const TEST_RESULT_OPTIONS = ["Đạt", "Không đạt"] as const;
const FILTER_INTEGRITY_TEST_RESULT_OPTIONS = [
  "Đạt",
  "Không đạt",
  "Không áp dụng",
] as const;
const TEST_RESULT_WITH_NOT_APPLICABLE_OPTIONS = [
  "Đạt",
  "Không đạt",
  "Không áp dụng",
] as const;
const DEVIATION_APPROVAL_OPTIONS = [
  "Đã phê duyệt",
  "Chưa phê duyệt",
] as const;
const notApplicableTestResultFields = new Set<(typeof testResultFields)[number]>([
  "filter_integrity_test_result",
  "sterilization_result",
  "online_particle_result",
]);

const testResultSchema = (
  label: string,
  options: readonly string[] = TEST_RESULT_OPTIONS,
) =>
  z
    .string()
    .trim()
    .min(1, `${label} là bắt buộc`)
    .refine(
      (value) => options.includes(value),
      { message: `${label} chỉ được chọn ${options.join(" hoặc ")}` },
    );

const formSchema = z.object({
  registration_number: z
    .string()
    .trim()
    .min(1, "Số đăng ký/số công bố là bắt buộc")
    .refine(
      (value) =>
        REGISTRATION_NUMBER_OPTIONS.includes(
          value as (typeof REGISTRATION_NUMBER_OPTIONS)[number],
      ),
      {
        message:
          "Số đăng ký/số công bố chỉ được chọn Còn hiệu lực hoặc Hết hiệu lực",
      },
    ),
  raw_material_test_result: testResultSchema("Kết quả nguyên liệu đầu vào"),
  water_test_result: testResultSchema("Kết quả kiểm nghiệm nước"),
  compressed_air_test_result: testResultSchema("Kết quả khí nén"),
  filter_integrity_test_result: testResultSchema(
    "Kết quả thử nguyên vẹn màng lọc",
    FILTER_INTEGRITY_TEST_RESULT_OPTIONS,
  ),
  packaging_inspection_result: testResultSchema("Kết quả kiểm tra bao bì"),
  finished_product_test_result: testResultSchema(
    "Kết quả kiểm nghiệm thành phẩm",
  ),
  sterilization_result: testResultSchema(
    "Kết quả tiệt trùng",
    TEST_RESULT_WITH_NOT_APPLICABLE_OPTIONS,
  ),
  online_particle_result: testResultSchema(
    "Kết quả tiểu phân online",
    TEST_RESULT_WITH_NOT_APPLICABLE_OPTIONS,
  ),
  yield_quantity: testResultSchema("Sản lượng"),
  deviation: testResultSchema("Sai lệch", DEVIATION_APPROVAL_OPTIONS),
  environment_monitoring_result: testResultSchema(
    "Kết quả giám sát môi trường",
  ),
});

type FormValues = z.infer<typeof formSchema>;
type RegistrationNumberValue =
  | ""
  | (typeof REGISTRATION_NUMBER_OPTIONS)[number];
type TestResultValue = "" | (typeof TEST_RESULT_OPTIONS)[number];
type FilterIntegrityTestResultValue =
  | ""
  | (typeof FILTER_INTEGRITY_TEST_RESULT_OPTIONS)[number];
type NotApplicableTestResultValue =
  | ""
  | (typeof TEST_RESULT_WITH_NOT_APPLICABLE_OPTIONS)[number];
type DeviationApprovalValue =
  | ""
  | (typeof DEVIATION_APPROVAL_OPTIONS)[number];
type TestResultOptionValue =
  | TestResultValue
  | FilterIntegrityTestResultValue
  | NotApplicableTestResultValue
  | DeviationApprovalValue;

const fieldLabels: Record<keyof FormValues, string> = {
  registration_number: "Số đăng ký/số công bố",
  raw_material_test_result: "Kết quả nguyên liệu đầu vào",
  water_test_result: "Kết quả kiểm nghiệm nước",
  compressed_air_test_result: "Kết quả khí nén",
  filter_integrity_test_result: "Kết quả thử nguyên vẹn màng lọc",
  packaging_inspection_result: "Kết quả kiểm tra bao bì",
  finished_product_test_result: "Kết quả kiểm nghiệm thành phẩm",
  sterilization_result: "Kết quả tiệt trùng",
  online_particle_result: "Kết quả tiểu phân online",
  yield_quantity: "Sản lượng",
  deviation: "Sai lệch",
  environment_monitoring_result: "Kết quả giám sát môi trường",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const toRegistrationNumberValue = (
  value: string | null | undefined,
): RegistrationNumberValue => {
  if (!value) {
    return "";
  }

  const registrationNumberValue =
    value as (typeof REGISTRATION_NUMBER_OPTIONS)[number];

  return REGISTRATION_NUMBER_OPTIONS.includes(registrationNumberValue)
    ? registrationNumberValue
    : "";
};

const toTestResultValue = (
  value: string | null | undefined,
  options: readonly string[] = TEST_RESULT_OPTIONS,
): TestResultOptionValue => {
  if (!value) {
    return "";
  }

  return options.includes(value)
    ? (value as TestResultOptionValue)
    : "";
};

const toFormValues = (
  data?: ProductionOrderFactoryReleaseReview,
): FormValues => ({
  registration_number: toRegistrationNumberValue(data?.registration_number),
  raw_material_test_result: toTestResultValue(data?.raw_material_test_result),
  water_test_result: toTestResultValue(data?.water_test_result),
  compressed_air_test_result: toTestResultValue(
    data?.compressed_air_test_result,
  ),
  filter_integrity_test_result: toTestResultValue(
    data?.filter_integrity_test_result,
    FILTER_INTEGRITY_TEST_RESULT_OPTIONS,
  ),
  packaging_inspection_result: toTestResultValue(
    data?.packaging_inspection_result,
  ),
  finished_product_test_result: toTestResultValue(
    data?.finished_product_test_result,
  ),
  sterilization_result: toTestResultValue(
    data?.sterilization_result,
    TEST_RESULT_WITH_NOT_APPLICABLE_OPTIONS,
  ),
  online_particle_result: toTestResultValue(
    data?.online_particle_result,
    TEST_RESULT_WITH_NOT_APPLICABLE_OPTIONS,
  ),
  yield_quantity: toTestResultValue(
    data?.yield_quantity === null || data?.yield_quantity === undefined
      ? undefined
      : String(data.yield_quantity),
  ),
  deviation: toTestResultValue(data?.deviation, DEVIATION_APPROVAL_OPTIONS),
  environment_monitoring_result: toTestResultValue(
    data?.environment_monitoring_result,
  ),
});

const normalizeValues = (values: FormValues): FormValues => ({
  registration_number: values.registration_number.trim(),
  raw_material_test_result: values.raw_material_test_result.trim(),
  water_test_result: values.water_test_result.trim(),
  compressed_air_test_result: values.compressed_air_test_result.trim(),
  filter_integrity_test_result: values.filter_integrity_test_result.trim(),
  packaging_inspection_result: values.packaging_inspection_result.trim(),
  finished_product_test_result: values.finished_product_test_result.trim(),
  sterilization_result: values.sterilization_result.trim(),
  online_particle_result: values.online_particle_result.trim(),
  yield_quantity: values.yield_quantity.trim(),
  deviation: values.deviation.trim(),
  environment_monitoring_result: values.environment_monitoring_result.trim(),
});

function RegistrationNumberToggle({
  value,
  disabled,
  onChange,
}: {
  value: RegistrationNumberValue;
  disabled?: boolean;
  onChange: (value: RegistrationNumberValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {REGISTRATION_NUMBER_OPTIONS.map((option) => {
        const isSelected = value === option;
        const isValid = option === "Còn hiệu lực";

        return (
          <Button
            key={option}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-pressed={isSelected}
            className={
              isSelected
                ? isValid
                  ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  : "border-red-600 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                : ""
            }
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        );
      })}
    </div>
  );
}

function TestResultToggle({
  value,
  disabled,
  onChange,
  options = TEST_RESULT_OPTIONS,
}: {
  value: TestResultOptionValue;
  disabled?: boolean;
  onChange: (value: TestResultOptionValue) => void;
  options?: readonly TestResultOptionValue[];
}) {
  const gridColumnsClass =
    options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className={`grid gap-2 ${gridColumnsClass}`}>
      {options.map((option) => {
        const isSelected = value === option;
        const isValid = option === "Đạt";

        return (
          <Button
            key={option}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-pressed={isSelected}
            className={
              isSelected
                ? isValid
                  ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  : "border-red-600 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                : ""
            }
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        );
      })}
    </div>
  );
}

export default function FormProductionOrderFactoryReleaseReview({
  productionOrderId,
  data,
  onClose,
  onSaved,
}: {
  productionOrderId?: string | number;
  data?: ProductionOrderFactoryReleaseReview;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const isEdit = data?.id !== undefined && data.id !== null;
  const initialValues = toFormValues(data);
  const listProductionOrderId = productionOrderId ?? data?.production_order_id;
  const reviewsKey = listProductionOrderId
    ? API_ROUTES.productionOrders.factoryReleaseReviews(listProductionOrderId)
    : null;
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useSWR(
    API_ROUTES.users.me,
    userService.fetcherMe,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: FormValues) => {
    if (!isEdit && !productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    if (!currentUser?.id) {
      toast.error("Không tìm thấy thông tin người dùng hiện tại.");
      return;
    }

    const normalizedValues = normalizeValues(values);
    const normalizedInitialValues = normalizeValues(initialValues);
    const changedKeys = (Object.keys(normalizedValues) as (keyof FormValues)[])
      .filter((key) => normalizedValues[key] !== normalizedInitialValues[key]);
    const approvedByChanged =
      String(data?.approved_by_id ?? data?.approvedBy?.id ?? "") !==
      String(currentUser.id);

    if (isEdit && changedKeys.length === 0 && !approvedByChanged) {
      toast.info("Không có thay đổi để cập nhật.");
      return;
    }

    try {
      if (isEdit) {
        const payload = changedKeys.reduce<
          Partial<FormValues> & { approved_by_id: string | number }
        >(
          (acc, key) => {
            acc[key] = normalizedValues[key];
            return acc;
          },
          { approved_by_id: currentUser.id },
        );

        await productionOrdersService.updateFactoryReleaseReview(
          data!.id!,
          payload,
        );
      } else {
        await productionOrdersService.createFactoryReleaseReview(
          productionOrderId!,
          {
            ...normalizedValues,
            approved_by_id: currentUser.id,
          },
        );
      }

      toast.success(
        isEdit
          ? "Đã cập nhật xét duyệt xuất xưởng."
          : "Đã lưu xét duyệt xuất xưởng.",
      );
      if (isEdit && data?.id) {
        await mutate(
          API_ROUTES.productionOrders.factoryReleaseReviewDetail(data.id),
        );
      }
      if (reviewsKey) {
        await mutate(reviewsKey);
      }
      form.reset(isEdit ? normalizedValues : toFormValues());
      onSaved?.();
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu xét duyệt xuất xưởng."),
      );
    }
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase">
            {isEdit
              ? "Cập nhật xét duyệt xuất xưởng"
              : "Xét duyệt xuất xưởng"}
          </p>

          <FormField
            control={form.control}
            name="registration_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{fieldLabels.registration_number}</FormLabel>
                <FormControl>
                  <RegistrationNumberToggle
                    value={field.value as RegistrationNumberValue}
                    disabled={form.formState.isSubmitting}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4">
            {testResultFields.map((fieldName) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldLabels[fieldName]}</FormLabel>
                    <FormControl>
                      <TestResultToggle
                        value={
                          field.value as TestResultOptionValue
                        }
                        disabled={form.formState.isSubmitting}
                        onChange={field.onChange}
                        options={
                          notApplicableTestResultFields.has(fieldName)
                            ? TEST_RESULT_WITH_NOT_APPLICABLE_OPTIONS
                            : fieldName === "deviation"
                              ? DEVIATION_APPROVAL_OPTIONS
                            : TEST_RESULT_OPTIONS
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={isEdit ? onClose : () => form.reset(toFormValues())}
            >
              {isEdit ? "Hủy" : "Đặt lại"}
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || isLoadingCurrentUser}
            >
              {form.formState.isSubmitting
                ? isEdit
                  ? "Đang cập nhật..."
                  : "Đang lưu..."
                : isEdit
                  ? "Cập nhật"
                  : "Lưu"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
