"use client";

import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { API_ROUTES } from "@/lib/api-routes";
import filterCatalogsService from "@/services/filter-catalogs.service";
import productionOrdersService from "@/services/product-orders.service";
import userService from "@/services/user.service";
import type { FilterCatalog } from "@/features/filter-catalogs";
import {
  getRemainingFilterCatalogUsageCount,
  isFilterCatalogUsable,
} from "@/features/filter-catalogs/utils";
import type { FiltrationCheck, FiltrationCheckPayload } from "../types";

const EMPTY_SELECT_VALUE = "__none__";
const FILTER_POSITION_OPTIONS = [
  "Sau tank pha",
  "Sau tank chứa",
  "Lọc nước",
  "Lọc cồn",
  "Lọc dịch",
] as const;

type FilterComboboxOption = {
  value: string;
  label: string;
  searchValue: string;
  sensoryRequirement: string;
  integrityRequirement: string;
  remainingUsageCount: number | null;
};

export default function FiltrationCheckForm({
  productionOrderId,
  data,
  onClose,
}: {
  productionOrderId: string | number;
  data?: FiltrationCheck;
  onClose: () => void;
}) {
  const comboboxPortalContainerRef = useRef<HTMLElement | null>(null);
  const setFormContainerRef = useCallback((node: HTMLFormElement | null) => {
    comboboxPortalContainerRef.current =
      node?.closest<HTMLElement>("[data-slot=\"dialog-content\"]") ?? null;
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterPosition, setFilterPosition] = useState(
    data?.filter_position ?? "",
  );
  const [preFilterAppearanceResult, setPreFilterAppearanceResult] = useState(
    data?.pre_filter_appearance_result ?? "",
  );
  const [filterMembraneId, setFilterMembraneId] = useState(
    data?.filter_membrane_id ? String(data.filter_membrane_id) : "",
  );
  const [preFilterAppearanceRequirement, setPreFilterAppearanceRequirement] =
    useState(data?.pre_filter_appearance_requirement ?? "");
  const [preSterilizationIntegrityRequirement, setPreSterilizationIntegrityRequirement] =
    useState(data?.pre_sterilization_integrity_requirement ?? "");
  const initialValues = useMemo(
    () => ({
      filter_position: data?.filter_position ?? "",
      filter_membrane_id: data?.filter_membrane_id ? String(data.filter_membrane_id) : "",
      pre_filter_appearance_requirement: data?.pre_filter_appearance_requirement ?? "",
      pre_filter_appearance_result: data?.pre_filter_appearance_result ?? "",
      pre_sterilization_integrity_requirement: data?.pre_sterilization_integrity_requirement ?? "",
      pre_sterilization_integrity_result: data?.pre_sterilization_integrity_result ?? "",
    }),
    [data],
  );
  const { data: filters } = useSWR<FilterCatalog[]>(
    API_ROUTES.filterCatalogs.base,
    filterCatalogsService.fetchFilterCatalogs,
  );
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useSWR<{
    id?: number;
  }>(API_ROUTES.users.me, userService.fetcherMe);
  const filterComboboxOptions = useMemo<FilterComboboxOption[]>(
    () =>
      [...(filters ?? [])]
        .filter(isFilterCatalogUsable)
        .sort((first, second) => second.id - first.id)
        .map((filter) => ({
        value: String(filter.id),
        label: `${filter.filter_code} — ${filter.filter_type}`,
        searchValue: `${filter.filter_code} ${filter.filter_type}`,
        sensoryRequirement: filter.pre_filter_sensory_requirement ?? "",
        integrityRequirement: filter.integrity_requirement ?? "",
        remainingUsageCount: getRemainingFilterCatalogUsageCount(filter),
        })),
    [filters],
  );
  const selectedFilterOption = filterComboboxOptions.find(
    (option) => option.value === filterMembraneId,
  );
  const hasSensoryRequirement =
    preFilterAppearanceRequirement.trim().length > 0;
  const hasIntegrityRequirement =
    preSterilizationIntegrityRequirement.trim().length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data && !currentUser?.id) {
      toast.error("Không tìm thấy thông tin người dùng hiện tại.");
      return;
    }
    const values = new FormData(event.currentTarget);
    const text = (key: string) => {
      const value = String(values.get(key) ?? "").trim();
      return value && value !== EMPTY_SELECT_VALUE ? value : null;
    };
    const positiveId = (key: string) => {
      const value = text(key);
      return value === null || value === EMPTY_SELECT_VALUE ? null : Number(value);
    };
    const payload: FiltrationCheckPayload = {
      filter_position: text("filter_position"),
      filter_membrane_id: positiveId("filter_membrane_id"),
      pre_filter_appearance_requirement: text("pre_filter_appearance_requirement"),
      pre_filter_appearance_result: text("pre_filter_appearance_result"),
      pre_sterilization_integrity_requirement: text("pre_sterilization_integrity_requirement"),
      pre_sterilization_integrity_result: text("pre_sterilization_integrity_result"),
      ...(!data ? { sterilized_by_id: currentUser!.id } : {}),
    };

    if (Object.values(payload).some((value) => typeof value === "number" && Number.isNaN(value))) {
      toast.error("Giá trị số không hợp lệ.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (data?.id !== undefined) {
        await productionOrdersService.updateFiltrationCheck(data.id, payload);
      } else {
        await productionOrdersService.createFiltrationCheck(productionOrderId, payload);
      }
      await mutate(API_ROUTES.productionOrders.filtrationChecks(productionOrderId));
      if (data?.id !== undefined) {
        await mutate(API_ROUTES.productionOrders.filtrationCheckDetail(data.id));
      }
      toast.success(data ? "Đã cập nhật kiểm tra quá trình lọc." : "Đã thêm kiểm tra quá trình lọc.");
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Không thể lưu kiểm tra quá trình lọc.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      key={data?.id ?? "new"}
      ref={setFormContainerRef}
      onSubmit={handleSubmit}
      className="flex min-h-[560px] flex-col gap-4 md:min-h-[600px]"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Vị trí lọc</Label>
          <input type="hidden" name="filter_position" value={filterPosition} />
          <Select
            value={filterPosition || undefined}
            onValueChange={setFilterPosition}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn vị trí lọc" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_POSITION_OPTIONS.map((position) => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Màng lọc</Label>
          <input
            type="hidden"
            name="filter_membrane_id"
            value={filterMembraneId}
          />
          <Combobox
            autoHighlight
            items={filterComboboxOptions}
            value={selectedFilterOption ?? null}
            onValueChange={(option) => {
              setFilterMembraneId(option?.value ?? "");
              setPreFilterAppearanceRequirement(
                option?.sensoryRequirement ?? "",
              );
              setPreSterilizationIntegrityRequirement(
                option?.integrityRequirement ?? "",
              );
              if (!option?.sensoryRequirement) {
                setPreFilterAppearanceResult("");
              }
            }}
            itemToStringLabel={(item) => item.label}
            itemToStringValue={(item) => item.searchValue}
            isItemEqualToValue={(item, value) => item.value === value.value}
          >
            <ComboboxInput
              className="w-full"
              disabled={isSubmitting}
              placeholder="Tìm và chọn màng lọc"
              showClear
            />
            <ComboboxContent portalContainer={comboboxPortalContainerRef}>
              <ComboboxEmpty>Không tìm thấy màng lọc.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item.value} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {selectedFilterOption &&
          selectedFilterOption.remainingUsageCount !== null ? (
            <p className="text-xs text-gray-500">
              Còn lại {selectedFilterOption.remainingUsageCount} lần sử dụng.
            </p>
          ) : null}
        </div>
        {hasSensoryRequirement ? <>
        <div className="space-y-2">
          <Label htmlFor="pre_filter_appearance_requirement">
            Yêu cầu cảm quan trước lọc
          </Label>
          <Input
            id="pre_filter_appearance_requirement"
            name="pre_filter_appearance_requirement"
            value={preFilterAppearanceRequirement}
            onChange={(event) =>
              setPreFilterAppearanceRequirement(event.target.value)
            }
            readOnly
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label>Kết quả cảm quan trước lọc</Label>
          <input
            type="hidden"
            name="pre_filter_appearance_result"
            value={preFilterAppearanceResult}
          />
          <div className="grid grid-cols-2 gap-2">
            {["Đạt", "Không đạt"].map((result) => (
              <Button
                key={result}
                type="button"
                variant={preFilterAppearanceResult === result ? "default" : "outline"}
                disabled={isSubmitting}
                className="w-full"
                onClick={() => setPreFilterAppearanceResult(result)}
              >
                {result}
              </Button>
            ))}
          </div>
        </div>
        </> : null}
        {hasIntegrityRequirement ? <>
        <div className="space-y-2">
          <Label htmlFor="pre_sterilization_integrity_requirement">
            Yêu cầu toàn vẹn trước tiệt trùng
          </Label>
          <Input
            id="pre_sterilization_integrity_requirement"
            name="pre_sterilization_integrity_requirement"
            value={preSterilizationIntegrityRequirement}
            onChange={(event) =>
              setPreSterilizationIntegrityRequirement(event.target.value)
            }
            readOnly
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pre_sterilization_integrity_result">
            Kết quả toàn vẹn sau tiệt trùng
          </Label>
          <Input
            id="pre_sterilization_integrity_result"
            name="pre_sterilization_integrity_result"
            defaultValue={initialValues.pre_sterilization_integrity_result}
            disabled={isSubmitting}
          />
        </div>
        </> : null}
      </div>
      <div className="mt-auto flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button><Button type="submit" disabled={isSubmitting || (!data && isLoadingCurrentUser)}>{isSubmitting ? "Đang lưu..." : "Lưu"}</Button></div>
    </form>
  );
}
