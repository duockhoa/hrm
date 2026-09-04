"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ROUTES } from "@/lib/api-routes";
import type { ProductionSpecificationPayload } from "@/services/production-specifications.service";
import {
  itemsService,
  dosageFormsService,
  productLinesService,
  productionSpecificationsService,
  registrationNumbersService,
} from "@/services/index.service";

const UNIT_OPTIONS = ["mg", "ml", "g"] as const;
const FILM_COATED_TABLET_WEIGHT_UNIT_OPTIONS = ["mg", "g"] as const;
const LOWER_LIMIT_OPERATOR_OPTIONS = [">", ">="] as const;
const UPPER_LIMIT_OPERATOR_OPTIONS = ["<", "<="] as const;
const NO_REGISTRATION_VALUE = "__none__";
const NO_DOSAGE_FORM_VALUE = "__none__";

const optionalNumberString = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+([.,]\d{1,6})?$/.test(value), {
    message: "Vui lòng nhập số hợp lệ, tối đa 6 chữ số thập phân",
  });

const optionalUnit = z.string().refine(
  (value) =>
    value === "" || UNIT_OPTIONS.includes(value as (typeof UNIT_OPTIONS)[number]),
  "Đơn vị không hợp lệ",
);

const optionalLowerLimitOperator = z.string().refine(
  (value) =>
    value === "" ||
    LOWER_LIMIT_OPERATOR_OPTIONS.includes(
      value as (typeof LOWER_LIMIT_OPERATOR_OPTIONS)[number],
    ),
  "Dấu kiểm soát không hợp lệ",
);

const optionalUpperLimitOperator = z.string().refine(
  (value) =>
    value === "" ||
    UPPER_LIMIT_OPERATOR_OPTIONS.includes(
      value as (typeof UPPER_LIMIT_OPERATOR_OPTIONS)[number],
    ),
  "Dấu kiểm soát không hợp lệ",
);

const optionalFilmCoatedTabletWeightUnit = z.string().refine(
  (value) =>
    value === "" ||
    FILM_COATED_TABLET_WEIGHT_UNIT_OPTIONS.includes(
      value as (typeof FILM_COATED_TABLET_WEIGHT_UNIT_OPTIONS)[number],
    ),
  "Đơn vị không hợp lệ",
);

const optionalHardnessUnit = z
  .string()
  .trim()
  .max(20, "Đơn vị độ cứng tối đa 20 ký tự");

const optionalMeasurementUnit = z
  .string()
  .trim()
  .max(20, "Đơn vị tối đa 20 ký tự");

const formSchema = z.object({
  product_line_ref: z.string().min(1, "Vui lòng chọn dòng sản phẩm"),
  registration_id: z.string(),
  dosage_form_id: z.string(),
  lower_control_limit: optionalNumberString,
  lower_control_limit_operator: optionalLowerLimitOperator,
  upper_control_limit: optionalNumberString,
  upper_control_limit_operator: optionalUpperLimitOperator,
  lower_allowed_limit: optionalNumberString,
  lower_allowed_limit_operator: optionalLowerLimitOperator,
  upper_allowed_limit: optionalNumberString,
  upper_allowed_limit_operator: optionalUpperLimitOperator,
  unit: optionalUnit,
  spray_dose_lower_control_limit: optionalNumberString,
  spray_dose_upper_control_limit: optionalNumberString,
  spray_dose_lower_allowed_limit: optionalNumberString,
  spray_dose_upper_allowed_limit: optionalNumberString,
  film_coated_tablet_weight_lower_control_limit: optionalNumberString,
  film_coated_tablet_weight_upper_control_limit: optionalNumberString,
  film_coated_tablet_weight_lower_allowed_limit: optionalNumberString,
  film_coated_tablet_weight_upper_allowed_limit: optionalNumberString,
  film_coated_tablet_weight_unit: optionalFilmCoatedTabletWeightUnit,
  hardness_lower_control_limit: optionalNumberString,
  hardness_upper_control_limit: optionalNumberString,
  hardness_lower_allowed_limit: optionalNumberString,
  hardness_upper_allowed_limit: optionalNumberString,
  hardness_unit: optionalHardnessUnit,
  tablet_thickness_control_limit: optionalNumberString,
  tablet_thickness_allowed_limit: optionalNumberString,
  tablet_thickness_unit: optionalMeasurementUnit,
  disintegration_time_control_limit: optionalNumberString,
  disintegration_time_allowed_limit: optionalNumberString,
  disintegration_time_unit: optionalMeasurementUnit,
});

type FormValues = z.infer<typeof formSchema>;
type RegistrationNumberOption = {
  id: number;
  registration_number: string;
  product_name?: string | null;
};
type RegistrationNumberComboboxOption = {
  value: string;
  label: string;
  searchValue: string;
};
type LimitValueFieldName =
  | "lower_control_limit"
  | "upper_control_limit"
  | "lower_allowed_limit"
  | "upper_allowed_limit";
type LimitOperatorFieldName =
  | "lower_control_limit_operator"
  | "upper_control_limit_operator"
  | "lower_allowed_limit_operator"
  | "upper_allowed_limit_operator";

const sanitizePayload = (
  payload: Omit<
    FormValues,
    "product_line_ref" | "registration_id" | "dosage_form_id"
  >,
): Partial<ProductionSpecificationPayload> => {
  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? null : value,
    ]),
  ) as Partial<ProductionSpecificationPayload>;

  const limitOperatorPairs: Array<
    [LimitValueFieldName, LimitOperatorFieldName]
  > = [
    ["lower_control_limit", "lower_control_limit_operator"],
    ["upper_control_limit", "upper_control_limit_operator"],
    ["lower_allowed_limit", "lower_allowed_limit_operator"],
    ["upper_allowed_limit", "upper_allowed_limit_operator"],
  ];

  for (const [limitField, operatorField] of limitOperatorPairs) {
    if (sanitizedPayload[limitField] === null) {
      sanitizedPayload[operatorField] = null;
    }
  }

  return sanitizedPayload;
};

function LimitInputField({
  control,
  label,
  operatorName,
  operatorOptions,
  valueName,
}: {
  control: Control<FormValues>;
  label: string;
  operatorName: LimitOperatorFieldName;
  operatorOptions:
    | typeof LOWER_LIMIT_OPERATOR_OPTIONS
    | typeof UPPER_LIMIT_OPERATOR_OPTIONS;
  valueName: LimitValueFieldName;
}) {
  return (
    <FormField
      control={control}
      name={operatorName}
      render={({ field: operatorField }) => (
        <FormField
          control={control}
          name={valueName}
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <div className="grid grid-cols-[96px_1fr] gap-2">
                  <Select
                    onValueChange={operatorField.onChange}
                    value={operatorField.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Dấu" />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" step="any" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    />
  );
}

export default function EditSemiFinishedProductForm({
  product,
  kind = "semi-finished",
  onClose,
  onSaved,
}: {
  product: any;
  kind?: "semi-finished" | "finished";
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const comboboxPortalContainerRef = useRef<HTMLElement | null>(null);
  const setFormContainerRef = useCallback((node: HTMLDivElement | null) => {
    comboboxPortalContainerRef.current =
      node?.closest<HTMLElement>('[data-slot="dialog-content"]') ?? null;
  }, []);
  const productionSpecification = product?.productionSpecification;
  const itemCode = product?.item_code ? String(product.item_code) : "";
  const itemLabel = kind === "finished" ? "thành phẩm" : "bán thành phẩm";
  const listRoute =
    kind === "finished"
      ? API_ROUTES.items.finishedProducts
      : API_ROUTES.items.semiFinishedProducts;
  const legacyProductLine = productionSpecification?.product_line
    ? String(productionSpecification.product_line)
    : "";
  const legacyProductLineRef = legacyProductLine
    ? `legacy:${legacyProductLine}`
    : "";
  const currentRegistrationId =
    product?.registration_id ?? product?.registration?.id;
  const initialRegistrationValue =
    currentRegistrationId !== null && currentRegistrationId !== undefined
      ? String(currentRegistrationId)
      : NO_REGISTRATION_VALUE;

  const {
    data: productLines = [],
    isLoading: isLoadingProductLines,
    error: productLinesError,
  } = useSWR(API_ROUTES.productLines.base, productLinesService.fetchProductLines);

  const {
    data: registrationNumbers = [],
    isLoading: isLoadingRegistrationNumbers,
    error: registrationNumbersError,
  } = useSWR(
    API_ROUTES.registrationNumbers.base,
    registrationNumbersService.fetchRegistrationNumbers,
  );

  const {
    data: dosageForms = [],
    isLoading: isLoadingDosageForms,
    error: dosageFormsError,
  } = useSWR(API_ROUTES.dosageForms.base, dosageFormsService.fetchAll);

  const dosageFormOptions = useMemo(() => {
    const currentDosageForm = productionSpecification?.dosageForm;

    if (
      !currentDosageForm?.id ||
      dosageForms.some(
        (dosageForm) =>
          String(dosageForm.id) === String(currentDosageForm.id),
      )
    ) {
      return dosageForms;
    }

    return [currentDosageForm, ...dosageForms];
  }, [dosageForms, productionSpecification?.dosageForm]);

  const registrationNumberOptions = useMemo<RegistrationNumberOption[]>(() => {
    const options = registrationNumbers;
    const currentRegistration = product?.registration;

    if (
      !currentRegistration?.id ||
      options.some(
        (registrationNumber) =>
          String(registrationNumber.id) === String(currentRegistration.id),
      )
    ) {
      return options;
    }

    return [
      {
        id: Number(currentRegistration.id),
        registration_number: currentRegistration.registration_number ?? "",
        product_name: currentRegistration.product_name ?? null,
      },
      ...options,
    ];
  }, [product?.registration, registrationNumbers]);

  const registrationComboboxOptions =
    useMemo<RegistrationNumberComboboxOption[]>(
      () =>
        registrationNumberOptions.map((registrationNumber) => {
          const label = [
            registrationNumber.registration_number,
            registrationNumber.product_name,
          ]
            .filter(Boolean)
            .join(" - ");

          return {
            value: String(registrationNumber.id),
            label,
            searchValue: [
              registrationNumber.registration_number,
              registrationNumber.product_name,
            ]
              .filter(Boolean)
              .join(" "),
          };
        }),
      [registrationNumberOptions],
    );

  const initialProductLineRef = useMemo(() => {
    const productLineId =
      productionSpecification?.product_line_id ??
      productionSpecification?.productLine?.id;

    if (productLineId) {
      return String(productLineId);
    }

    if (!legacyProductLine) {
      return "";
    }

    const legacy = legacyProductLine.toLowerCase();
    const matchedProductLine = productLines.find((productLine) => {
      const code = productLine.code?.toLowerCase();
      const name = productLine.name?.toLowerCase();

      return code === legacy || name === legacy;
    });

    return matchedProductLine ? String(matchedProductLine.id) : legacyProductLineRef;
  }, [legacyProductLine, legacyProductLineRef, productLines, productionSpecification]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_line_ref: initialProductLineRef,
      registration_id: initialRegistrationValue,
      dosage_form_id: String(
        productionSpecification?.dosage_form_id ??
          productionSpecification?.dosageForm?.id ??
          NO_DOSAGE_FORM_VALUE,
      ),
      lower_control_limit: productionSpecification?.lower_control_limit ?? "",
      lower_control_limit_operator:
        productionSpecification?.lower_control_limit_operator ?? "",
      upper_control_limit: productionSpecification?.upper_control_limit ?? "",
      upper_control_limit_operator:
        productionSpecification?.upper_control_limit_operator ?? "",
      lower_allowed_limit: productionSpecification?.lower_allowed_limit ?? "",
      lower_allowed_limit_operator:
        productionSpecification?.lower_allowed_limit_operator ?? "",
      upper_allowed_limit: productionSpecification?.upper_allowed_limit ?? "",
      upper_allowed_limit_operator:
        productionSpecification?.upper_allowed_limit_operator ?? "",
      unit: productionSpecification?.unit ?? "",
      spray_dose_lower_control_limit:
        productionSpecification?.spray_dose_lower_control_limit ?? "",
      spray_dose_upper_control_limit:
        productionSpecification?.spray_dose_upper_control_limit ?? "",
      spray_dose_lower_allowed_limit:
        productionSpecification?.spray_dose_lower_allowed_limit ?? "",
      spray_dose_upper_allowed_limit:
        productionSpecification?.spray_dose_upper_allowed_limit ?? "",
      film_coated_tablet_weight_lower_control_limit:
        productionSpecification?.film_coated_tablet_weight_lower_control_limit ??
        "",
      film_coated_tablet_weight_upper_control_limit:
        productionSpecification?.film_coated_tablet_weight_upper_control_limit ??
        "",
      film_coated_tablet_weight_lower_allowed_limit:
        productionSpecification?.film_coated_tablet_weight_lower_allowed_limit ??
        "",
      film_coated_tablet_weight_upper_allowed_limit:
        productionSpecification?.film_coated_tablet_weight_upper_allowed_limit ??
        "",
      film_coated_tablet_weight_unit:
        productionSpecification?.film_coated_tablet_weight_unit ?? "",
      hardness_lower_control_limit:
        productionSpecification?.hardness_lower_control_limit ?? "",
      hardness_upper_control_limit:
        productionSpecification?.hardness_upper_control_limit ?? "",
      hardness_lower_allowed_limit:
        productionSpecification?.hardness_lower_allowed_limit ?? "",
      hardness_upper_allowed_limit:
        productionSpecification?.hardness_upper_allowed_limit ?? "",
      hardness_unit: productionSpecification?.hardness_unit ?? "N",
      tablet_thickness_control_limit:
        productionSpecification?.tablet_thickness_control_limit ?? "",
      tablet_thickness_allowed_limit:
        productionSpecification?.tablet_thickness_allowed_limit ?? "",
      tablet_thickness_unit:
        productionSpecification?.tablet_thickness_unit ?? "mm",
      disintegration_time_control_limit:
        productionSpecification?.disintegration_time_control_limit ?? "",
      disintegration_time_allowed_limit:
        productionSpecification?.disintegration_time_allowed_limit ?? "",
      disintegration_time_unit:
        productionSpecification?.disintegration_time_unit ?? "phút",
    },
  });

  useEffect(() => {
    const currentProductLineRef = form.getValues("product_line_ref");

    if (
      initialProductLineRef &&
      (!currentProductLineRef ||
        (currentProductLineRef === legacyProductLineRef &&
          currentProductLineRef !== initialProductLineRef))
    ) {
      form.setValue("product_line_ref", initialProductLineRef);
    }
  }, [form, initialProductLineRef, legacyProductLineRef]);

  const refreshData = async () => {
    await Promise.all([
      mutate(`${API_ROUTES.items.base}/${itemCode}`),
      mutate(listRoute),
      mutate(`${API_ROUTES.productionSpecifications.base}/${itemCode}`),
    ]);
  };

  const onSubmit = async (values: FormValues) => {
    if (!itemCode) {
      toast.error(`Không tìm thấy mã ${itemLabel}.`);
      return;
    }

    try {
      const {
        product_line_ref,
        registration_id,
        dosage_form_id,
        ...payload
      } = values;
      const sanitizedPayload = sanitizePayload(payload);
      const productionSpecificationPayload = product_line_ref.startsWith(
        "legacy:",
      )
        ? {
            ...sanitizedPayload,
            dosage_form_id:
              dosage_form_id === NO_DOSAGE_FORM_VALUE
                ? null
                : Number(dosage_form_id),
            product_line: product_line_ref.replace("legacy:", ""),
          }
        : {
            ...sanitizedPayload,
            dosage_form_id:
              dosage_form_id === NO_DOSAGE_FORM_VALUE
                ? null
                : Number(dosage_form_id),
            product_line_id: Number(product_line_ref),
          };

      await Promise.all([
        productionSpecificationsService.updateProductionSpecification(
          itemCode,
          productionSpecificationPayload,
        ),
        itemsService.updateItem(itemCode, {
          registration_id:
            registration_id === NO_REGISTRATION_VALUE
              ? null
              : Number(registration_id),
        }),
      ]);
      toast.success("Đã lưu thông số sản xuất.");

      await refreshData();
      onSaved?.();
      onClose?.();
    } catch (error: any) {
      toast.error(error?.message || "Không thể lưu thông số sản xuất.");
      console.error("Error saving production specification:", error);
    }
  };

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
  };

  return (
    <div ref={setFormContainerRef} className="p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)}>
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-900">
              {product?.item_name ?? itemLabel}
            </p>
            <p className="mt-1 text-sm text-gray-600">{itemCode}</p>
          </div>

          <FormField
            control={form.control}
            name="product_line_ref"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Dòng sản phẩm</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingProductLines}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingProductLines
                            ? "Đang tải dòng sản phẩm"
                            : "Chọn dòng sản phẩm"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      {legacyProductLineRef &&
                      !productLines.some(
                        (productLine) =>
                          String(productLine.id) === initialProductLineRef,
                      ) ? (
                        <SelectItem
                          key={legacyProductLineRef}
                          value={legacyProductLineRef}
                        >
                          {legacyProductLine}
                        </SelectItem>
                      ) : null}
                      {productLines.map((productLine) => (
                        <SelectItem
                          key={productLine.id}
                          value={String(productLine.id)}
                        >
                          {productLine.code
                            ? `${productLine.code} - ${productLine.name}`
                            : productLine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {productLinesError ? (
                  <p className="text-xs text-red-600">
                    Không thể tải danh sách dòng sản phẩm.
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="registration_id"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Số đăng ký</FormLabel>
                <FormControl>
                  <Combobox
                    autoHighlight
                    items={registrationComboboxOptions}
                    value={
                      field.value === NO_REGISTRATION_VALUE
                        ? null
                        : (registrationComboboxOptions.find(
                            (option) => option.value === field.value,
                          ) ?? null)
                    }
                    onValueChange={(option) => {
                      field.onChange(option?.value ?? NO_REGISTRATION_VALUE);
                    }}
                    itemToStringLabel={(item) => item.label}
                    itemToStringValue={(item) => item.searchValue}
                    isItemEqualToValue={(item, value) =>
                      item.value === value.value
                    }
                  >
                    <ComboboxInput
                      className="w-full"
                      disabled={isLoadingRegistrationNumbers}
                      placeholder={
                        isLoadingRegistrationNumbers
                          ? "Đang tải số đăng ký"
                          : "Tìm và chọn số đăng ký"
                      }
                      showClear
                    />
                    <ComboboxContent
                      portalContainer={comboboxPortalContainerRef}
                    >
                      <ComboboxEmpty>
                        Không tìm thấy số đăng ký.
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (
                          <ComboboxItem key={item.value} value={item}>
                            {item.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </FormControl>
                {registrationNumbersError ? (
                  <p className="text-xs text-red-600">
                    Không thể tải danh sách số đăng ký.
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dosage_form_id"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Dạng bào chế</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingDosageForms}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingDosageForms
                            ? "Đang tải dạng bào chế"
                            : "Chọn dạng bào chế"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value={NO_DOSAGE_FORM_VALUE}>
                        Không chọn
                      </SelectItem>
                      {dosageFormOptions.map((dosageForm) => (
                        <SelectItem
                          key={dosageForm.id}
                          value={String(dosageForm.id)}
                        >
                          {dosageForm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {dosageFormsError ? (
                  <p className="text-xs text-red-600">
                    Không thể tải danh sách dạng bào chế.
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <LimitInputField
              control={form.control}
              label="Giới hạn kiểm soát dưới"
              operatorName="lower_control_limit_operator"
              operatorOptions={LOWER_LIMIT_OPERATOR_OPTIONS}
              valueName="lower_control_limit"
            />

            <LimitInputField
              control={form.control}
              label="Giới hạn kiểm soát trên"
              operatorName="upper_control_limit_operator"
              operatorOptions={UPPER_LIMIT_OPERATOR_OPTIONS}
              valueName="upper_control_limit"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <LimitInputField
              control={form.control}
              label="Giới hạn cho phép dưới"
              operatorName="lower_allowed_limit_operator"
              operatorOptions={LOWER_LIMIT_OPERATOR_OPTIONS}
              valueName="lower_allowed_limit"
            />

            <LimitInputField
              control={form.control}
              label="Giới hạn cho phép trên"
              operatorName="upper_allowed_limit_operator"
              operatorOptions={UPPER_LIMIT_OPERATOR_OPTIONS}
              valueName="upper_allowed_limit"
            />
          </div>

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Đơn vị</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn đơn vị" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-4 text-sm font-semibold text-gray-900">
              Thông số số liều xịt
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="spray_dose_lower_control_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Giới hạn kiểm soát dưới</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spray_dose_upper_control_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Giới hạn kiểm soát trên</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="spray_dose_lower_allowed_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Giới hạn cho phép dưới</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spray_dose_upper_allowed_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Giới hạn cho phép trên</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-4 text-sm font-semibold text-gray-900">
              Thông số khối lượng viên nén bao phim
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="film_coated_tablet_weight_lower_control_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Giới hạn kiểm soát dưới</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="film_coated_tablet_weight_upper_control_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Giới hạn kiểm soát trên</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="film_coated_tablet_weight_lower_allowed_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Giới hạn cho phép dưới</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="film_coated_tablet_weight_upper_allowed_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Giới hạn cho phép trên</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="film_coated_tablet_weight_unit"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Đơn vị khối lượng viên nén bao phim</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn đơn vị" />
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        {FILM_COATED_TABLET_WEIGHT_UNIT_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-4 text-sm font-semibold text-gray-900">
              Thông số độ cứng
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="hardness_lower_control_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Độ cứng kiểm soát dưới</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hardness_upper_control_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Độ cứng kiểm soát trên</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="hardness_lower_allowed_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Độ cứng cho phép dưới</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hardness_upper_allowed_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Độ cứng cho phép trên</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hardness_unit"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Đơn vị độ cứng</FormLabel>
                  <FormControl>
                    <Input placeholder="N" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-4 text-sm font-semibold text-gray-900">
              Thông số độ dày viên
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tablet_thickness_control_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Độ dày kiểm soát</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tablet_thickness_allowed_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Độ dày cho phép</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tablet_thickness_unit"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Đơn vị độ dày</FormLabel>
                  <FormControl>
                    <Input placeholder="mm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-4 text-sm font-semibold text-gray-900">
              Thông số thời gian rã
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="disintegration_time_control_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Thời gian rã kiểm soát</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disintegration_time_allowed_limit"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Thời gian rã cho phép</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="disintegration_time_unit"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Đơn vị thời gian rã</FormLabel>
                  <FormControl>
                    <Input placeholder="phút" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="ml-2"
              disabled={form.formState.isSubmitting}
              onClick={() => form.reset()}
            >
              Đặt lại
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
