"use client";

import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import useUserStore from "@/store/user.store";

type ProductionOrder = {
  item?: {
    item_name?: string | null;
  } | null;
  item_code?: string | number | null;
  item_name?: string | null;
  lot_no?: string | null;
};

type ProductionOrdersStage = {
  StageID?: number | string | null;
  StageEntry?: number | string | null;
  SequenceNumber?: number | string | null;
};

type ProductionOrderLine = {
  LineNumber?: number | string | null;
  ItemNo?: string | number | null;
  ItemName?: string | null;
  PlannedQuantity?: number | string | null;
  IssuedQuantity?: number | string | null;
  UnitOfMeasurement?: {
    Code?: string | number | null;
    Name?: string | null;
  } | null;
  ProductionOrdersStage?: ProductionOrdersStage | null;
};

const parseStageIds = (value: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map(Number).filter((item) => !Number.isNaN(item))
      : [];
  } catch {
    return value
      .split(",")
      .map(Number)
      .filter((item) => !Number.isNaN(item));
  }
};

const getStageValue = (stage?: ProductionOrdersStage | null) => {
  if (!stage) {
    return null;
  }

  const value = Number(
    stage.StageID ?? stage.StageEntry ?? stage.SequenceNumber,
  );

  return Number.isNaN(value) ? null : value;
};

const formatDate = (value = new Date()) =>
  value.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const getShortUserName = (value: string) => {
  const parts = value.trim().split(/\s+/);
  return parts.at(-1) ?? "";
};

function EditableInfo({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`dispensed-label-info ${className}`}
      contentEditable
      suppressContentEditableWarning
    >
      {children}
    </span>
  );
}

function Label({
  line,
  productName,
  lotNo,
  user,
}: {
  line: ProductionOrderLine;
  productName: string;
  lotNo: string;
  user: string;
}) {
  return (
    <div className="dispensed-label-wrapper">
      <table>
        <thead>
          <tr>
            <th className="dispensed-label-title">NHÃN CẤP PHÁT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div className="dispensed-label-row">
                <span className="dispensed-label-heading">Tên hàng hóa:</span>
                <EditableInfo className="dispensed-label-material-name">
                  {" "}
                  {line.ItemName ?? ""}
                </EditableInfo>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="dispensed-label-row">
                <span className="dispensed-label-heading">Mã hàng:</span>
                <EditableInfo>{line.ItemNo ?? ""}</EditableInfo>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="dispensed-label-row">
                <span className="dispensed-label-heading">Cho SP:</span>
                <EditableInfo>{productName}</EditableInfo>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="dispensed-label-row">
                <span className="dispensed-label-heading">Số lô:</span>
                <span
                  className="dispensed-label-product-id"
                  contentEditable
                  suppressContentEditableWarning
                >
                  {lotNo}
                </span>
                <span className="dispensed-label-heading">Ngày: </span>
                <EditableInfo> {formatDate()}</EditableInfo>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="dispensed-label-row">
                <span className="dispensed-label-heading">
                  Khối lượng, số lượng:{" "}
                </span>
                <EditableInfo> </EditableInfo>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="dispensed-label-row">
                <span className="dispensed-label-heading">
                  Người thực hiện:{" "}
                </span>
                <EditableInfo>{user}</EditableInfo>
                <span className="dispensed-label-heading">
                  Người kiểm tra:{" "}
                </span>
                <EditableInfo> </EditableInfo>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function DispensedMaterialLabelPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const stageIds = parseStageIds(searchParams.get("stageid"));
  const { user } = useUserStore();
  const userName = getShortUserName(user?.name ?? "");

  const { data: productionOrder, error: orderError } = useSWR<ProductionOrder>(
    id ? `${API_ROUTES.productionOrders.base}/${id}` : null,
    () => productOrdersService.fetchProductionOrderById(id),
  );

  const { data: productionOrderLines, error: linesError } = useSWR<
    ProductionOrderLine[]
  >(
    id
      ? `${API_ROUTES.productionOrders.base}/${id}/production-order-lines`
      : null,
    () => productOrdersService.fetchProductionOrderLines(id),
  );

  const filteredLines =
    productionOrderLines?.filter((line) => {
      if (stageIds.length === 0) {
        return true;
      }

      const stageValue = getStageValue(line.ProductionOrdersStage);
      return stageValue !== null && stageIds.includes(stageValue);
    }) ?? [];

  const productName =
    productionOrder?.item?.item_name ??
    productionOrder?.item_name ??
    String(productionOrder?.item_code ?? "");
  const lotNo = productionOrder?.lot_no ?? "";
  const isLoading = id && (!productionOrder || !productionOrderLines);
  const hasError = orderError || linesError;

  return (
    <main className="dispensed-label-page">
      {!id ? (
        <p className="dispensed-label-message">Thiếu mã lệnh sản xuất.</p>
      ) : hasError ? (
        <p className="dispensed-label-message">Không thể tải dữ liệu nhãn.</p>
      ) : isLoading ? (
        <p className="dispensed-label-message">Đang tải dữ liệu nhãn...</p>
      ) : filteredLines.length === 0 ? (
        <p className="dispensed-label-message">Không có nguyên liệu phù hợp.</p>
      ) : (
        filteredLines.map((line, index) => (
          <Label
            key={`${line.LineNumber ?? index}-${line.ItemNo ?? ""}`}
            line={line}
            productName={productName}
            lotNo={lotNo}
            user={userName}
          />
        ))
      )}

      <style jsx global>{`
        .dispensed-label-page {
          width: 500px;
          min-height: 100vh;
          background: #fff;
          color: #000;
          font-family: "Times New Roman", Times, serif;
          font-size: 16px;
          line-height: 1.5;
          text-rendering: optimizeLegibility;
        }

        .dispensed-label-page * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .dispensed-label-message {
          padding: 10px;
          font-size: 18px;
        }

        .dispensed-label-wrapper {
          border: 2px solid;
          margin: 10px;
          position: relative;
        }

        .dispensed-label-wrapper table {
          border-collapse: collapse;
          height: 330px;
          width: 100%;
        }

        .dispensed-label-wrapper td,
        .dispensed-label-wrapper th {
          border: 1px solid #000;
          padding: 1px;
        }

        .dispensed-label-title {
          font-size: 28px;
          padding-top: 10px;
        }

        .dispensed-label-row {
          display: flex;
        }

        .dispensed-label-heading {
          font-size: 20px;
          font-weight: 700;
          padding: 0 5px;
          white-space: nowrap;
        }

        .dispensed-label-info {
          background-image: radial-gradient(
            circle,
            #777 0.45px,
            transparent 0.55px
          );
          background-position: left calc(100% - 1px);
          background-repeat: repeat-x;
          background-size: 4px 1px;
          display: inline-block;
          flex: 1 1;
          font-size: 20px;
          font-weight: 500;
          min-width: 80px;
          outline: none;
        }

        .dispensed-label-material-name {
          font-weight: 600;
        }

        .dispensed-label-product-id {
          background-image: radial-gradient(
            circle,
            #777 0.45px,
            transparent 0.55px
          );
          background-position: left calc(100% - 1px);
          background-repeat: repeat-x;
          background-size: 4px 1px;
          display: inline-block;
          font-size: 20px;
          min-width: 100px;
          outline: none;
          width: 50px;
        }

        @media print {
          body {
            background: #fff !important;
          }

          .dispensed-label-page {
            width: 500px;
          }
        }
      `}</style>
    </main>
  );
}
