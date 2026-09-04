"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

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
      className={`isolated-label-info ${className}`}
      contentEditable
      suppressContentEditableWarning
    >
      {children}
    </span>
  );
}

export default function IsolatedMaterialLabelPage() {
  const searchParams = useSearchParams();
  const labelQuantity = parseLabelQuantity(searchParams.get("quantity"));

  return (
    <main className="isolated-label-page">
      {Array.from({ length: labelQuantity }, (_, index) => (
      <div key={index} className="isolated-label-wrapper">
        <table>
          <thead>
            <tr>
              <th className="isolated-label-title">NHÃN BIỆT TRỮ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="isolated-label-row">
                  <span className="isolated-label-heading">Tên BTP:</span>
                  <EditableInfo className="isolated-label-material-name">
                    {" "}
                  </EditableInfo>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="isolated-label-row">
                  <span className="isolated-label-heading">Mã hàng:</span>
                  <EditableInfo> </EditableInfo>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="isolated-label-row">
                  <span className="isolated-label-heading">Số lô:</span>
                  <EditableInfo> </EditableInfo>
                  <span className="isolated-label-heading">Ngày: </span>
                  <EditableInfo> </EditableInfo>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="isolated-label-row">
                  <span className="isolated-label-heading">Số lượng:</span>
                  <EditableInfo> </EditableInfo>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="isolated-label-row">
                  <span className="isolated-label-heading">
                    Lý do biệt trữ:
                  </span>
                  <EditableInfo> </EditableInfo>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="isolated-label-row">
                  <span className="isolated-label-heading">
                    Người thực hiện:{" "}
                  </span>
                  <EditableInfo> </EditableInfo>
                  <span className="isolated-label-heading">
                    Người kiểm tra:{" "}
                  </span>
                  <EditableInfo> </EditableInfo>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      ))}

      <style jsx global>{`
        .isolated-label-page {
          width: 500px;
          min-height: 100vh;
          background: #fff;
          color: #000;
          font-family: "Times New Roman", Times, serif;
          font-size: 16px;
          line-height: 1.5;
          text-rendering: optimizeLegibility;
        }

        .isolated-label-page * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .isolated-label-wrapper {
          border: 2px solid;
          margin: 10px;
          position: relative;
        }

        .isolated-label-wrapper table {
          border-collapse: collapse;
          height: 330px;
          width: 100%;
        }

        .isolated-label-wrapper td,
        .isolated-label-wrapper th {
          border: 1px solid #000;
          padding: 1px;
        }

        .isolated-label-title {
          font-size: 28px;
          padding-top: 10px;
        }

        .isolated-label-row {
          display: flex;
        }

        .isolated-label-heading {
          font-size: 20px;
          font-weight: 700;
          padding: 0 5px;
          white-space: nowrap;
        }

        .isolated-label-info {
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

        .isolated-label-material-name {
          font-weight: 600;
        }

        @media print {
          body {
            background: #fff !important;
          }

          .isolated-label-page {
            width: 500px;
          }
        }
      `}</style>
    </main>
  );
}
