"use client";

import { API_ROUTES } from "@/lib/api-routes";
import { productOrdersService } from "@/services/index.service";
import useUserStore from "@/store/user.store";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";

type ProductionOrder = {
  item?: {
    item_name?: string | null;
  } | null;
  item_code?: string | number | null;
  item_name?: string | null;
  lot_no?: string | null;
};

const getShortUserName = (value: string) => {
  const parts = value.trim().split(/\s+/);
  return parts.at(-1) ?? "";
};

const parseLabelQuantity = (value: string | null) => {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
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
      className={`semi-finished-label-info ${className}`}
      contentEditable
      suppressContentEditableWarning
    >
      {children}
    </span>
  );
}

export default function SemiFinishedProductLabelPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const labelQuantity = parseLabelQuantity(searchParams.get("quantity"));
  const { user } = useUserStore();
  const userName = getShortUserName(user?.name ?? "");

  const { data: productionOrder, error } = useSWR<ProductionOrder>(
    id ? `${API_ROUTES.productionOrders.base}/${id}` : null,
    () => productOrdersService.fetchProductionOrderById(id),
  );

  const productName =
    productionOrder?.item?.item_name ??
    productionOrder?.item_name ??
    String(productionOrder?.item_code ?? "");
  const productCode = String(productionOrder?.item_code ?? "");
  const lotNo = productionOrder?.lot_no ?? "";
  const isLoading = id && !productionOrder;

  return (
    <main className="semi-finished-label-page">
      {!id ? (
        <p className="semi-finished-label-message">Thiếu mã lệnh sản xuất.</p>
      ) : error ? (
        <p className="semi-finished-label-message">
          Không thể tải dữ liệu nhãn.
        </p>
      ) : isLoading ? (
        <p className="semi-finished-label-message">Đang tải dữ liệu nhãn...</p>
      ) : (
        Array.from({ length: labelQuantity }, (_, index) => (
          <div key={index} className="semi-finished-label-wrapper">
          <table>
            <thead>
              <tr>
                <th className="semi-finished-label-title">
                  NHÃN BÁN THÀNH PHẨM
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="semi-finished-label-row semi-finished-label-name-row">
                    <span className="semi-finished-label-heading">
                      Tên BTP:
                    </span>
                    <EditableInfo className="semi-finished-label-material-name semi-finished-label-name-line">
                      {" "}
                      {productName}
                    </EditableInfo>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="semi-finished-label-row">
                    <span className="semi-finished-label-heading">Số lô:</span>
                    <EditableInfo>{lotNo}</EditableInfo>
                    <span className="semi-finished-label-heading">Người: </span>
                    <EditableInfo>{userName}</EditableInfo>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="semi-finished-label-row">
                    <span className="semi-finished-label-heading">Mã SP:</span>
                    <EditableInfo>{productCode}</EditableInfo>
                    <span className="semi-finished-label-heading">STT:</span>
                    <EditableInfo>{index + 1}</EditableInfo>
                  </div>
                </td>
              </tr>

              <tr>
                <td>
                  <div className="semi-finished-label-row">
                    <span className="semi-finished-label-heading">
                      Ngày thực hiện:
                    </span>
                    <EditableInfo className="semi-finished-label-date-line">
                      {"          /          /20      "}
                    </EditableInfo>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="semi-finished-label-row">
                    <span className="semi-finished-label-heading">
                      Ghi chú:
                    </span>
                    <EditableInfo className="semi-finished-label-note-line">
                      {" "}
                    </EditableInfo>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        ))
      )}

      <style jsx global>{`
        .semi-finished-label-page {
          width: 500px;
          min-height: 100vh;
          background: #fff;
          color: #000;
          font-family: "Times New Roman", Times, serif;
          font-size: 16px;
          line-height: 1.5;
          text-rendering: optimizeLegibility;
        }

        .semi-finished-label-page * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .semi-finished-label-message {
          padding: 10px;
          font-size: 18px;
        }

        .semi-finished-label-wrapper {
          border: 2px solid;
          break-inside: avoid;
          margin: 10px;
          page-break-inside: avoid;
          position: relative;
        }

        .semi-finished-label-wrapper table {
          border-collapse: collapse;
          height: 330px;
          width: 100%;
        }

        .semi-finished-label-wrapper td,
        .semi-finished-label-wrapper th {
          border: 1px solid #000;
          padding: 1px;
        }

        .semi-finished-label-title {
          font-size: 28px;
          padding-top: 10px;
        }

        .semi-finished-label-row {
          display: flex;
        }

        .semi-finished-label-name-row {
          background-image: radial-gradient(
            circle,
            #777 0.45px,
            transparent 0.55px
          );
          background-position: left calc(100% - 1px);
          background-repeat: repeat-x;
          background-size: 4px 1px;
          display: block;
          text-align: left;
        }

        .semi-finished-label-heading {
          font-size: 20px;
          font-weight: 700;
          padding: 0 5px;
          white-space: nowrap;
        }

        .semi-finished-label-info {
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

        .semi-finished-label-material-name {
          font-weight: 600;
        }

        .semi-finished-label-name-line {
          background-image: none;
          display: inline;
          flex: none;
          line-height: 30px;
          min-height: 40px;
          min-width: 0;
          padding-top: 4px;
        }

        .semi-finished-label-note-line {
          line-height: 30px;
          min-height: 50px;
          padding-top: 4px;
        }

        .semi-finished-label-date-line {
          white-space: pre;
        }

        @media print {
          body {
            background: #fff !important;
          }

          .semi-finished-label-page {
            width: 500px;
          }
        }
      `}</style>
    </main>
  );
}
