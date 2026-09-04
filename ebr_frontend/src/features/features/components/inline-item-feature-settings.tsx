"use client";

import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { featuresService, itemsService } from "@/services/index.service";
import { Copy, LoaderCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { FEATURE_GROUPS, getFeatureKindOrder } from "../constants";
import type { Feature, ItemFeatureConfigEntry } from "../types";

type ItemFeatureRow = {
  feature_id: number;
  key: string;
  kind: string;
  label: string;
  group_name: string | null;
  order: number;
  enabled: boolean;
  linked: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const buildRows = (
  features: Feature[] | undefined,
  configFeatures: ItemFeatureConfigEntry[] | undefined,
): ItemFeatureRow[] => {
  const configByFeatureId = new Map(
    (configFeatures ?? []).map((feature) => [feature.feature_id, feature]),
  );

  return (features ?? [])
    .map((feature) => {
      const config = configByFeatureId.get(feature.id);

      return {
        feature_id: feature.id,
        key: feature.key,
        kind: feature.kind,
        label: feature.label,
        group_name: feature.group_name,
        order: config?.order ?? feature.default_order ?? 0,
        enabled: config?.enabled ?? false,
        linked: Boolean(config),
      };
    })
    .sort((first, second) => {
      const kindOrder =
        getFeatureKindOrder(first.kind) - getFeatureKindOrder(second.kind);

      if (kindOrder !== 0) {
        return kindOrder;
      }

      return first.order - second.order;
    });
};

type Item = {
  item_code?: string | number | null;
  item_name?: string | null;
  dk_code?: string | null;
};

type CopySourceOption = {
  value: string;
  label: string;
  searchValue: string;
  item: Item;
};

type ItemFeatureGroup = {
  name: string;
  rows: ItemFeatureRow[];
};

const buildGroups = (rows: ItemFeatureRow[]): ItemFeatureGroup[] => {
  const rowsByGroup = new Map<string, ItemFeatureRow[]>();

  rows.forEach((row) => {
    const groupName = row.group_name?.trim() || "Chưa phân nhóm";
    const groupRows = rowsByGroup.get(groupName) ?? [];
    groupRows.push(row);
    rowsByGroup.set(groupName, groupRows);
  });

  const groupOrder = new Map(
    FEATURE_GROUPS.map((group, index) => [group.value, index]),
  );

  return Array.from(rowsByGroup, ([name, groupRows]) => ({
    name,
    rows: groupRows,
  })).sort((first, second) => {
    const firstOrder = groupOrder.get(first.name) ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = groupOrder.get(second.name) ?? Number.MAX_SAFE_INTEGER;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return first.name.localeCompare(second.name, "vi");
  });
};

type FeatureSettingsGroupProps = {
  group: ItemFeatureGroup;
  getDraftRow: (row: ItemFeatureRow) => ItemFeatureRow;
  savingFeatureId: number | null;
  disabled?: boolean;
  onToggleEnabled: (row: ItemFeatureRow, enabled: boolean) => void;
  onUpdateOrder: (row: ItemFeatureRow, order: number) => void;
  onSaveRow: (row: ItemFeatureRow) => void;
};

function FeatureSettingsGroup({
  group,
  getDraftRow,
  savingFeatureId,
  disabled = false,
  onToggleEnabled,
  onUpdateOrder,
  onSaveRow,
}: FeatureSettingsGroupProps) {
  return (
    <section className="overflow-hidden rounded-md border">
      <h3 className="border-b bg-gray-50 px-4 py-3 font-semibold">
        {group.name}
      </h3>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Tính năng</TableHead>
            <TableHead className="w-28">Loại</TableHead>
            <TableHead className="w-28 text-center">Trạng thái</TableHead>
            <TableHead className="w-32 text-right">Thứ tự</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.rows.map((row) => {
            const draftRow = getDraftRow(row);
            const isSaving = savingFeatureId === row.feature_id;
            const isDisabled = disabled || isSaving;

            return (
              <TableRow key={row.feature_id}>
                <TableCell>
                  <div className="font-medium">{row.label}</div>
                  <div className="mt-1 font-mono text-xs text-gray-500">
                    {row.key}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {row.kind}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    checked={draftRow.enabled}
                    disabled={isDisabled}
                    onChange={(event) =>
                      onToggleEnabled(row, event.target.checked)
                    }
                    aria-label={`Bật tắt ${row.label}`}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="ml-auto w-24 text-right"
                    value={draftRow.order}
                    onChange={(event) =>
                      onUpdateOrder(row, Number(event.target.value) || 0)
                    }
                    onBlur={() => onSaveRow(row)}
                    disabled={isDisabled}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}

export default function InlineItemFeatureSettings({
  itemCode,
}: {
  itemCode: string | undefined;
}) {
  const [draftRows, setDraftRows] = useState<Record<number, ItemFeatureRow>>(
    {},
  );
  const [savingFeatureId, setSavingFeatureId] = useState<number | null>(null);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copySourceCode, setCopySourceCode] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const copyDialogContentRef = useRef<HTMLDivElement | null>(null);

  const { data: features, isLoading: isFeaturesLoading } = useSWR(
    "/features",
    featuresService.fetchFeatures,
  );

  const {
    data: itemFeatureConfig,
    isLoading: isItemFeaturesLoading,
    mutate,
  } = useSWR(
    itemCode ? `/features/items/${itemCode}/config?includeDisabled=true` : null,
    () => featuresService.fetchItemFeatureConfig(itemCode!, true),
  );

  const {
    data: items = [],
    error: itemsError,
    isLoading: isItemsLoading,
  } = useSWR(
    isCopyDialogOpen ? "/items?feature-copy=true" : null,
    itemsService.fetchItems,
  );

  const {
    data: copySourceConfig,
    error: copySourceConfigError,
    isLoading: isCopySourceConfigLoading,
  } = useSWR(
    isCopyDialogOpen && copySourceCode
      ? `/features/items/${encodeURIComponent(copySourceCode)}/config?includeDisabled=true`
      : null,
    () => featuresService.fetchItemFeatureConfig(copySourceCode, true),
  );

  const rows = useMemo(
    () => buildRows(features, itemFeatureConfig?.features),
    [features, itemFeatureConfig?.features],
  );
  const groups = useMemo(() => buildGroups(rows), [rows]);
  const copySourceOptions = useMemo<CopySourceOption[]>(() => {
    const normalizedCurrentItemCode = itemCode?.trim().toLocaleLowerCase();
    const uniqueItems = new Map<string, Item>();

    (Array.isArray(items) ? items : []).forEach((item: Item) => {
      const code = String(item.item_code ?? "").trim();

      if (
        !code ||
        code.toLocaleLowerCase() === normalizedCurrentItemCode ||
        uniqueItems.has(code)
      ) {
        return;
      }

      uniqueItems.set(code, item);
    });

    return Array.from(uniqueItems, ([code, item]) => {
      const name = item.item_name?.trim();
      const registrationNumber = item.dk_code?.trim();
      const label = name ? `${code} - ${name}` : code;

      return {
        value: code,
        label,
        searchValue: `${code} ${name ?? ""} ${registrationNumber ?? ""}`,
        item,
      };
    }).sort((first, second) =>
      first.value.localeCompare(second.value, "vi", {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [itemCode, items]);
  const selectedCopySource =
    copySourceOptions.find((option) => option.value === copySourceCode) ?? null;
  const activeCopySourceConfig =
    String(copySourceConfig?.item_code ?? "").trim() === copySourceCode
      ? copySourceConfig
      : undefined;
  const copySourceFeatureMap = useMemo(
    () =>
      new Map(
        (activeCopySourceConfig?.features ?? []).map((feature) => [
          feature.feature_id,
          feature,
        ]),
      ),
    [activeCopySourceConfig?.features],
  );
  const enabledSourceFeatureCount = useMemo(
    () =>
      (features ?? []).reduce(
        (count, feature) =>
          count + (copySourceFeatureMap.get(feature.id)?.enabled ? 1 : 0),
        0,
      ),
    [copySourceFeatureMap, features],
  );

  const getDraftRow = (row: ItemFeatureRow) => draftRows[row.feature_id] ?? row;

  const updateDraftRow = (
    row: ItemFeatureRow,
    patch: Partial<ItemFeatureRow>,
  ) => {
    setDraftRows((current) => ({
      ...current,
      [row.feature_id]: {
        ...getDraftRow(row),
        ...patch,
      },
    }));
  };

  const handleSaveRow = async (row: ItemFeatureRow) => {
    if (!itemCode) {
      return;
    }

    const draftRow = getDraftRow(row);

    if (row.linked && draftRow.order === row.order) {
      return;
    }

    setSavingFeatureId(row.feature_id);

    try {
      if (row.linked) {
        await featuresService.updateItemFeature(itemCode, row.feature_id, {
          enabled: draftRow.enabled,
          order: draftRow.order,
        });
      } else {
        await featuresService.upsertItemFeature(itemCode, {
          feature_id: row.feature_id,
          enabled: draftRow.enabled,
          order: draftRow.order,
        });
      }

      setDraftRows((current) => {
        const next = { ...current };
        delete next[row.feature_id];
        return next;
      });
      await mutate();
      toast.success("Đã lưu cấu hình tính năng.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu cấu hình tính năng."));
    } finally {
      setSavingFeatureId(null);
    }
  };

  const handleToggleEnabled = async (row: ItemFeatureRow, enabled: boolean) => {
    if (!itemCode) {
      return;
    }

    const draftRow = getDraftRow(row);
    setSavingFeatureId(row.feature_id);
    setDraftRows((current) => ({
      ...current,
      [row.feature_id]: {
        ...draftRow,
        enabled,
      },
    }));

    try {
      if (row.linked) {
        await featuresService.updateItemFeature(itemCode, row.feature_id, {
          enabled,
          order: draftRow.order,
        });
      } else {
        await featuresService.upsertItemFeature(itemCode, {
          feature_id: row.feature_id,
          enabled,
          order: draftRow.order,
        });
      }

      setDraftRows((current) => {
        const next = { ...current };
        if (draftRow.order === row.order) {
          delete next[row.feature_id];
        } else {
          next[row.feature_id] = {
            ...draftRow,
            enabled,
          };
        }
        return next;
      });
      await mutate();
      toast.success("Đã cập nhật trạng thái biểu mẫu.");
    } catch (error) {
      setDraftRows((current) => ({
        ...current,
        [row.feature_id]: draftRow,
      }));
      toast.error(
        getErrorMessage(error, "Không thể cập nhật trạng thái biểu mẫu."),
      );
    } finally {
      setSavingFeatureId(null);
    }
  };

  const closeCopyDialog = () => {
    setIsCopyDialogOpen(false);
    setCopySourceCode("");
  };

  const handleCopyFeatures = async () => {
    if (!itemCode || !copySourceCode || !features || !activeCopySourceConfig) {
      return;
    }

    const sourceFeatureById = new Map(
      activeCopySourceConfig.features.map((feature) => [
        feature.feature_id,
        feature,
      ]),
    );
    const copiedFeatures = features.map((feature) => {
      const sourceFeature = sourceFeatureById.get(feature.id);

      return {
        feature_id: feature.id,
        enabled: sourceFeature?.enabled ?? false,
        order: sourceFeature?.order ?? feature.default_order ?? 0,
      };
    });

    setIsCopying(true);

    try {
      await featuresService.replaceItemFeatureConfig(itemCode, copiedFeatures);
      setDraftRows({});
      await mutate();
      closeCopyDialog();
      toast.success(
        `Đã sao chép toàn bộ tính năng từ ${copySourceCode} sang ${itemCode}.`,
      );
    } catch (error) {
      await mutate();
      toast.error(
        getErrorMessage(error, "Không thể sao chép cấu hình tính năng."),
      );
    } finally {
      setIsCopying(false);
    }
  };

  if (!itemCode) {
    return null;
  }

  const isLoading = isFeaturesLoading || isItemFeaturesLoading;

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tính năng của mã hàng</h2>
        <Button
          type="button"
          variant="outline"
          disabled={isLoading || isCopying || savingFeatureId !== null}
          onClick={() => setIsCopyDialogOpen(true)}
        >
          <Copy className="size-4" />
          Sao chép từ mã hàng
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded bg-gray-100"
            />
          ))}
        </div>
      ) : groups.length > 0 ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <FeatureSettingsGroup
              key={group.name}
              group={group}
              getDraftRow={getDraftRow}
              savingFeatureId={savingFeatureId}
              disabled={isCopying}
              onToggleEnabled={handleToggleEnabled}
              onUpdateOrder={(row, order) => updateDraftRow(row, { order })}
              onSaveRow={handleSaveRow}
            />
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có tính năng nào trong danh mục.
        </div>
      )}

      <Dialog
        open={isCopyDialogOpen}
        onOpenChange={(open) => {
          if (isCopying) {
            return;
          }

          if (open) {
            setIsCopyDialogOpen(true);
          } else {
            closeCopyDialog();
          }
        }}
      >
        <DialogContent ref={copyDialogContentRef} className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Sao chép tính năng từ mã hàng khác</DialogTitle>
            <DialogDescription>
              Toàn bộ trạng thái và thứ tự tính năng của mã nguồn sẽ ghi đè cấu
              hình hiện tại của {itemCode}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Mã hàng nguồn</Label>
            <Combobox
              autoHighlight
              items={copySourceOptions}
              value={selectedCopySource}
              onValueChange={(option) => setCopySourceCode(option?.value ?? "")}
              itemToStringLabel={(option) => option.label}
              itemToStringValue={(option) => option.searchValue}
              isItemEqualToValue={(option, selected) =>
                option.value === selected.value
              }
            >
              <ComboboxInput
                className="w-full"
                disabled={isCopying || isItemsLoading}
                placeholder={
                  isItemsLoading
                    ? "Đang tải danh sách mã hàng..."
                    : "Tìm theo mã hoặc tên hàng hóa"
                }
                showClear
              />
              <ComboboxContent portalContainer={copyDialogContentRef}>
                <ComboboxEmpty>Không tìm thấy mã hàng phù hợp.</ComboboxEmpty>
                <ComboboxList>
                  {(option) => (
                    <ComboboxItem key={option.value} value={option}>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {option.item.item_code}
                          {option.item.item_name
                            ? ` - ${option.item.item_name}`
                            : ""}
                        </p>
                        {option.item.dk_code ? (
                          <p className="truncate text-xs text-muted-foreground">
                            Số đăng ký: {option.item.dk_code}
                          </p>
                        ) : null}
                      </div>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {itemsError ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(
                  itemsError,
                  "Không thể tải danh sách mã hàng.",
                )}
              </p>
            ) : null}
          </div>

          {selectedCopySource ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Nguồn: {selectedCopySource.label}</p>
              {isCopySourceConfigLoading ? (
                <p className="mt-1 text-muted-foreground">
                  Đang tải cấu hình tính năng...
                </p>
              ) : copySourceConfigError ? (
                <p className="mt-1 text-destructive">
                  {getErrorMessage(
                    copySourceConfigError,
                    "Không thể tải cấu hình của mã hàng nguồn.",
                  )}
                </p>
              ) : activeCopySourceConfig ? (
                <p className="mt-1 text-muted-foreground">
                  {enabledSourceFeatureCount}/{features?.length ?? 0} tính năng
                  đang bật. Cấu hình hiện tại của {itemCode} sẽ được thay thế.
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isCopying}
              onClick={closeCopyDialog}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={
                isCopying ||
                isItemsLoading ||
                isCopySourceConfigLoading ||
                Boolean(itemsError) ||
                Boolean(copySourceConfigError) ||
                !selectedCopySource ||
                !activeCopySourceConfig ||
                !features
              }
              onClick={() => void handleCopyFeatures()}
            >
              {isCopying ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Copy className="size-4" />
              )}
              {isCopying ? "Đang sao chép..." : "Sao chép và ghi đè"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
