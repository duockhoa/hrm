"use client";

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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { equipmentService, itemsService } from "@/services/index.service";
import { getItemCodePrefix } from "@/lib/item-code-prefix";
import { Copy, LoaderCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

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

export default function InlineItemEquipmentSettings({
  itemCode,
}: {
  itemCode: string | undefined;
}) {
  const [selectionOverrides, setSelectionOverrides] = useState<
    Record<number, boolean>
  >({});
  const [savingEquipmentId, setSavingEquipmentId] = useState<number | null>(
    null,
  );
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copySourceCode, setCopySourceCode] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const copyDialogContentRef = useRef<HTMLDivElement | null>(null);
  const itemCodePrefix = getItemCodePrefix(itemCode);

  const {
    data: itemEquipment,
    error: itemEquipmentError,
    isLoading: isItemEquipmentLoading,
    mutate: mutateItemEquipment,
  } = useSWR(itemCode ? `/items/${itemCode}/equipment` : null, () =>
    itemsService.fetchItemEquipment(itemCode!),
  );

  const {
    data: equipment,
    error: equipmentError,
    isLoading: isEquipmentLoading,
  } = useSWR("/equipment", equipmentService.fetchEquipment);

  const {
    data: items = [],
    error: itemsError,
    isLoading: isItemsLoading,
  } = useSWR(
    isCopyDialogOpen
      ? `/items?equipment-copy=true&codePrefix=${itemCodePrefix ?? ""}`
      : null,
    () =>
      itemCodePrefix
        ? itemsService.fetchItemsByCodePrefix(itemCodePrefix)
        : itemsService.fetchItems(),
  );

  const itemEquipmentByEquipmentId = useMemo(
    () =>
      new Map(
        (itemEquipment ?? []).map((entry) => [entry.equipment_id, entry]),
      ),
    [itemEquipment],
  );

  const sortedEquipment = useMemo(
    () =>
      (equipment ?? [])
        .slice()
        .sort((first, second) => first.code.localeCompare(second.code)),
    [equipment],
  );

  const copySourceOptions = useMemo<CopySourceOption[]>(() => {
    const normalizedCurrentItemCode = itemCode?.trim().toLocaleLowerCase();
    const uniqueItems = new Map<string, Item>();

    (Array.isArray(items) ? items : []).forEach((item: Item) => {
      const code = String(item.item_code ?? "").trim();

      if (
        !code ||
        code.toLocaleLowerCase() === normalizedCurrentItemCode ||
        (itemCodePrefix && getItemCodePrefix(code) !== itemCodePrefix) ||
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
  }, [itemCode, itemCodePrefix, items]);

  const selectedCopySource =
    copySourceOptions.find((option) => option.value === copySourceCode) ?? null;
  const getIsSelected = (equipmentId: number) =>
    selectionOverrides[equipmentId] ??
    itemEquipmentByEquipmentId.has(equipmentId);

  const handleToggleEquipment = async (
    equipmentId: number,
    selected: boolean,
  ) => {
    if (!itemCode) {
      return;
    }

    const itemEquipmentEntry = itemEquipmentByEquipmentId.get(equipmentId);
    setSavingEquipmentId(equipmentId);
    setSelectionOverrides((current) => ({
      ...current,
      [equipmentId]: selected,
    }));

    try {
      if (selected) {
        await itemsService.createItemEquipment(itemCode, {
          equipment_id: equipmentId,
        });
        toast.success("Đã thêm thiết bị cho mã hàng.");
      } else if (itemEquipmentEntry) {
        await itemsService.deleteItemEquipment(itemEquipmentEntry.id);
        toast.success("Đã xóa thiết bị khỏi mã hàng.");
      }

      setSelectionOverrides((current) => {
        const next = { ...current };
        delete next[equipmentId];
        return next;
      });
      await mutateItemEquipment();
    } catch (error) {
      setSelectionOverrides((current) => {
        const next = { ...current };
        delete next[equipmentId];
        return next;
      });
      toast.error(
        getErrorMessage(error, "Không thể cập nhật thiết bị cho mã hàng."),
      );
    } finally {
      setSavingEquipmentId(null);
    }
  };

  const closeCopyDialog = () => {
    setIsCopyDialogOpen(false);
    setCopySourceCode("");
  };

  const handleCopyEquipment = async () => {
    if (!itemCode || !copySourceCode) {
      return;
    }

    setIsCopying(true);

    try {
      const copiedEquipment = await itemsService.copyItemEquipment(
        itemCode,
        copySourceCode,
      );
      setSelectionOverrides({});
      await mutateItemEquipment(copiedEquipment, false);
      closeCopyDialog();
      toast.success(
        `Đã sao chép thiết bị từ ${copySourceCode} sang ${itemCode}.`,
      );
    } catch (error) {
      await mutateItemEquipment();
      toast.error(
        getErrorMessage(error, "Không thể sao chép thiết bị của mã hàng."),
      );
    } finally {
      setIsCopying(false);
    }
  };

  if (!itemCode) {
    return null;
  }

  const isLoading = isItemEquipmentLoading || isEquipmentLoading;

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Thiết bị của mã hàng</h2>
          <p className="mt-1 text-sm text-gray-500">
            Tích chọn các thiết bị được dùng cho mã hàng này.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCopyDialogOpen(true)}
          disabled={isLoading || isCopying || savingEquipmentId !== null}
        >
          <Copy className="size-4" />
          Sao chép từ mã hàng
        </Button>
      </div>

      {itemEquipmentError || equipmentError ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không thể tải danh sách thiết bị của mã hàng.
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded bg-gray-100"
            />
          ))}
        </div>
      ) : sortedEquipment.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-36">Mã thiết bị</TableHead>
              <TableHead>Tên thiết bị</TableHead>
              <TableHead className="w-28 text-center">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEquipment.map((entry) => {
              const isSaving = savingEquipmentId === entry.id;

              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs">
                    {entry.code}
                  </TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-gray-300 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      checked={getIsSelected(entry.id)}
                      disabled={isCopying || isSaving}
                      onChange={(event) =>
                        handleToggleEquipment(entry.id, event.target.checked)
                      }
                      aria-label={`Bật tắt ${entry.name}`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Chưa có thiết bị nào trong danh mục.
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
            <DialogTitle>Sao chép thiết bị từ mã hàng khác</DialogTitle>
            <DialogDescription>
              Toàn bộ danh sách thiết bị của mã nguồn sẽ ghi đè danh sách hiện
              tại của {itemCode}.
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
                    : itemCodePrefix
                      ? `Tìm mã ${itemCodePrefix} hoặc tên hàng hóa`
                      : "Tìm theo mã hoặc tên hàng hóa"
                }
                showClear
              />
              <ComboboxContent portalContainer={copyDialogContentRef}>
                <ComboboxEmpty>
                  Không tìm thấy mã hàng cùng nhóm phù hợp.
                </ComboboxEmpty>
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
              <p className="mt-1 text-muted-foreground">
                Danh sách thiết bị hiện tại của {itemCode} sẽ được thay thế
                bằng danh sách từ mã hàng nguồn.
              </p>
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
                Boolean(itemsError) ||
                !selectedCopySource
              }
              onClick={() => void handleCopyEquipment()}
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
