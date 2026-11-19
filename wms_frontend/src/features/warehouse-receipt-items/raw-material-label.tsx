"use client";

import { useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { WarehouseReceiptItem } from "@/services/warehouse-receipt-items.service";
import styles from "./raw-material-label.module.css";

function EditableInfo({
  children,
  label,
  onChange,
}: {
  children?: ReactNode;
  label: string;
  onChange?: (value: string) => void;
}) {
  // Let the browser retain the edited text and caret while the QR updates.
  const [initialContent] = useState(() => children);
  return (
    <span
      className={styles.editable}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      onInput={(event) => onChange?.(event.currentTarget.textContent ?? "")}
      onPaste={(event) => {
        // Keep pasted content plain so spreadsheet styling cannot alter the label.
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        onChange?.(event.currentTarget.textContent ?? "");
      }}
    >
      {initialContent}
    </span>
  );
}

const formatExpiryDate = (value: string | null) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "";

const formatReceivedDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      });
};

export default function RawMaterialLabel({
  receipt,
}: {
  receipt: WarehouseReceiptItem;
}) {
  const [itemCode, setItemCode] = useState(receipt.item_code);
  const [lotNumber, setLotNumber] = useState(receipt.lot_number);
  const userName = (
    receipt.enteredBy?.name ||
    receipt.enteredBy?.username ||
    ""
  ).trim().split(/\s+/).at(-1) ?? "";
  const quantity =
    receipt.quantity === null
      ? ""
      : Number(receipt.quantity).toLocaleString("vi-VN", {
          maximumFractionDigits: 3,
        });
  const quantityWithUnit = [quantity, receipt.unit].filter(Boolean).join(" ");
  const qrValue = `${itemCode}$${lotNumber}`;

  return (
    <div className={styles.wrapper}>
      <table className={styles.label} aria-label="Nhãn biệt trữ nguyên liệu">
        <colgroup>
          <col className={styles.headingColumn} />
          <col className={styles.valueColumn} />
          <col className={styles.containerColumn} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={4} className={styles.title}>NHÃN BIỆT TRỮ</th>
          </tr>
        </thead>
        <tbody>
          <tr className={styles.nameRow}>
            <th scope="row">Tên NL:</th>
            <td colSpan={3} className={styles.primaryValue}>
              <EditableInfo label="Tên nguyên liệu">
                {receipt.item?.item_name || receipt.item_code}
              </EditableInfo>
            </td>
          </tr>
          <tr>
            <th scope="row">Số lô:</th>
            <td colSpan={3} className={styles.primaryValue}>
              <EditableInfo label="Số lô" onChange={setLotNumber}>
                {lotNumber}
              </EditableInfo>
            </td>
          </tr>
          <tr>
            <th scope="row">Mã NL:</th>
            <td className={styles.primaryValue}>
              <EditableInfo label="Mã nguyên liệu" onChange={setItemCode}>
                {itemCode}
              </EditableInfo>
            </td>
            <td colSpan={2} rowSpan={5} className={styles.qrCell}>
              <QRCodeSVG
                value={qrValue}
                size={168}
                level="M"
                marginSize={4}
                title={`Mã QR nguyên liệu ${qrValue}`}
              />
            </td>
          </tr>
          <tr>
            <th scope="row">HSD:</th>
            <td>
              <EditableInfo label="Hạn sử dụng">
                {formatExpiryDate(receipt.expiry_date)}
              </EditableInfo>
            </td>
          </tr>
          <tr>
            <th scope="row">Số lượng:</th>
            <td>
              <EditableInfo label="Số lượng">{quantityWithUnit}</EditableInfo>
            </td>
          </tr>
          <tr>
            <th scope="row">Ngày</th>
            <td>
              <EditableInfo label="Ngày nhập kho">
                {formatReceivedDate(receipt.received_at)}
              </EditableInfo>
            </td>
          </tr>
          <tr>
            <th scope="row">Người:</th>
            <td>
              <EditableInfo label="Người nhập kho">{userName}</EditableInfo>
            </td>
          </tr>
          <tr>
            <th scope="row">Tình trạng</th>
            <td><EditableInfo label="Tình trạng" /></td>
            <th scope="row" className={styles.containerHeading}>STT thùng/tổng:</th>
            <td><EditableInfo label="Số thứ tự thùng trên tổng số thùng" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
