"use client";

import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  AlertCircle,
  ArrowDown,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_ROUTES } from "@/lib/api-routes";
import { PRODUCTION_ORDER_DATA_CHANGED } from "@/lib/production-order-data-events";
import { productOrdersService } from "@/services/index.service";

export const getProductionOrderSectionId = (key: string) =>
  `production-order-section-${key}`;

export default function ProductionOrderCompletenessChecklist({
  productionOrderId,
}: {
  productionOrderId: string | number;
}) {
  const { mutate: mutateCache } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR(
    API_ROUTES.productionOrders.completeness(productionOrderId),
    () =>
      productOrdersService.fetchProductionOrderCompleteness(productionOrderId),
    { refreshInterval: 30000, revalidateOnMount: true, dedupingInterval: 0 },
  );

  useEffect(() => {
    const revalidate = (event: Event) => {
      void mutate();
      const url = (event as CustomEvent<{ url: string }>).detail?.url ?? "";
      if (url.startsWith("/features/") || url.includes("/document-control/")) {
        void mutateCache(
          `${API_ROUTES.productionOrders.base}/${productionOrderId}`,
        );
      }
    };
    window.addEventListener(PRODUCTION_ORDER_DATA_CHANGED, revalidate);
    return () =>
      window.removeEventListener(PRODUCTION_ORDER_DATA_CHANGED, revalidate);
  }, [mutate, mutateCache, productionOrderId]);

  return (
    <section
      aria-label="Dữ liệu bắt buộc của hồ sơ lô"
      className="w-full max-w-4xl rounded-md border bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold">Dữ liệu bắt buộc của hồ sơ lô</h2>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Không thể kiểm tra dữ liệu bắt buộc. Vui lòng thử lại.
        </p>
      ) : isLoading || !data ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang kiểm tra dữ liệu...
        </p>
      ) : (
        <>
          {data.required_count === 0 ? (
            <p className="mt-3 text-sm">
              Lô này chưa có section bắt buộc có dữ liệu.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium">
                Đã có dữ liệu {data.completed_count}/{data.required_count} mục
                bắt buộc
              </p>
              <ul className="mt-2 divide-y">
                {data.required_sections.map((section) => (
                  <li
                    key={section.key}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {section.status === "has_data" ? (
                        <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                      ) : (
                        <AlertCircle className="size-4 shrink-0 text-amber-600" />
                      )}
                      <a
                        className="text-sm font-medium hover:underline"
                        href={`#${getProductionOrderSectionId(section.key)}`}
                        onClick={(event) => {
                          const target = document.getElementById(
                            getProductionOrderSectionId(section.key),
                          );
                          if (target) {
                            event.preventDefault();
                            target.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                            target.focus({ preventScroll: true });
                          }
                        }}
                        title={section.rule}
                      >
                        {section.label}
                        <ArrowDown className="ml-1 inline size-3" />
                      </a>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        section.status === "has_data"
                          ? "border-green-200 text-green-700"
                          : "border-amber-200 text-amber-700"
                      }
                    >
                      {section.status === "has_data"
                        ? "Đã có dữ liệu"
                        : section.status === "missing"
                          ? "Chưa có dữ liệu"
                          : "Chưa kiểm tra được"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
