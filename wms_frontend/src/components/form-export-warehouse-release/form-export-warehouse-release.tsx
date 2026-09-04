"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import productionOrdersService from "@/services/product-orders.service";

type ProductionOrdersStage = {
  StageID?: number | string | null;
  StageEntry?: number | string | null;
  SequenceNumber?: number | string | null;
  Name?: string | null;
};

type ProductionOrderLine = {
  ProductionOrdersStage?: ProductionOrdersStage | null;
};

const getStageValue = (stage: ProductionOrdersStage) =>
  Number(stage.StageID ?? stage.StageEntry ?? stage.SequenceNumber);

const getStageLabel = (stage: ProductionOrdersStage) => {
  const sequenceNumber =
    stage.SequenceNumber ?? stage.StageID ?? stage.StageEntry;
  const name = stage.Name ?? "";

  return [sequenceNumber, name].filter(Boolean).join(" - ");
};

const getFileNameFromContentDisposition = (contentDisposition?: string) => {
  if (!contentDisposition) {
    return null;
  }

  const utf8FileName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8FileName?.[1]) {
    return decodeURIComponent(utf8FileName[1]);
  }

  const fileName = contentDisposition.match(/filename="?([^"]+)"?/i);
  return fileName?.[1] ?? null;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function ExportWarehouseRelease({
  data,
  productionOrderLines = [],
  onClose,
}: {
  data: any;
  productionOrderLines?: ProductionOrderLine[];
  onClose?: () => void;
}) {
  const stageAnchor = useComboboxAnchor();
  const stageOptions = productionOrderLines.reduce<ProductionOrdersStage[]>(
    (options, line) => {
      const stage = line.ProductionOrdersStage;

      if (!stage) {
        return options;
      }

      const value = getStageValue(stage);

      if (
        Number.isNaN(value) ||
        options.some((option) => getStageValue(option) === value)
      ) {
        return options;
      }

      return [...options, stage];
    },
    [],
  );
  const stageComboboxOptions = stageOptions.map((stage) => ({
    value: getStageValue(stage),
    label: getStageLabel(stage),
  }));
  const formSchema = z.object({
    id: z.string().min(2).max(100),
    stage: z.array(z.number()),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: String(data?.DocumentAbsoluteEntry ?? data?.id ?? ""),
      stage: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await productionOrdersService.exportWarehouseRelease(
        values.id,
        values.stage,
      );
      const fileName =
        getFileNameFromContentDisposition(
          response.headers["content-disposition"],
        ) ?? `production-order-${values.id}.xlsx`;

      downloadBlob(response.data, fileName);
      toast.success("Xuất phiếu thành công");
      form.reset();
      onClose?.();
    } catch {
      toast.error("Xuất phiếu thất bại");
    }
  };

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
    toast.error("Please fix the errors in the form");
  };

  return (
    <div className="h-[100%] min-h-[220px] rounded-md bg-white p-4 shadow-md">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onError)}
          className="flex flex-col gap-4"
        >
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Xuất phiếu xuất kho
          </p>
          <FormField
            control={form.control}
            name="stage"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-2">
                  <FormLabel>
                    Chọn giai đoạn
                  </FormLabel>
                  <FormControl>
                  <Combobox
                    multiple
                    autoHighlight
                    items={stageComboboxOptions}
                    value={stageComboboxOptions.filter((option) =>
                      field.value.includes(option.value),
                    )}
                    onValueChange={(values) => {
                      field.onChange(values.map((option) => option.value));
                    }}
                    itemToStringLabel={(item) => item.label}
                    itemToStringValue={(item) => String(item.value)}
                    isItemEqualToValue={(item, value) =>
                      item.value === value.value
                    }
                  >
                    <ComboboxChips ref={stageAnchor} className="min-w-0">
                      <ComboboxValue>
                        {(values) => (
                          <React.Fragment>
                            {values.map(
                              (
                                value: (typeof stageComboboxOptions)[number],
                              ) => (
                                <ComboboxChip key={value.value}>
                                  {value.label}
                                </ComboboxChip>
                              ),
                            )}
                            <ComboboxChipsInput placeholder="Chọn giai đoạn" />
                          </React.Fragment>
                        )}
                      </ComboboxValue>
                    </ComboboxChips>
                    <ComboboxContent anchor={stageAnchor}>
                      <ComboboxEmpty>Không tìm thấy giai đoạn.</ComboboxEmpty>
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
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div aria-hidden className="h-32" />
          <div className="flex justify-end pt-1">
            <Button type="submit">Xuất phiếu</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
