"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import RawMaterialLabel from "@/features/warehouse-receipt-items/raw-material-label";
import warehouseReceiptItemsService, {
  WAREHOUSE_RECEIPT_ITEMS_URL,
} from "@/services/warehouse-receipt-items.service";
import styles from "@/features/warehouse-receipt-items/raw-material-label.module.css";

export default function RawMaterialLabelPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const receiptId = Number(id);
  const isValidId =
    /^\d+$/.test(id) &&
    Number.isSafeInteger(receiptId) &&
    receiptId > 0 &&
    receiptId <= 2147483647;
  const { data, error, isLoading } = useSWR(
    isValidId ? `${WAREHOUSE_RECEIPT_ITEMS_URL}/${receiptId}` : null,
    () => warehouseReceiptItemsService.read(receiptId),
    { revalidateOnFocus: false },
  );
  const canPrint = Boolean(data && !error && isValidId);

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <Button variant="outline" size="sm" asChild>
          <Link href={isValidId ? `/home/${receiptId}` : "/home"}>
            <ArrowLeft className="size-4" /> Kiểm hàng nhập kho
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canPrint}
          onClick={() => window.print()}
        >
          <Printer className="size-4" /> In nhãn
        </Button>
      </div>

      {!id ? (
        <p role="alert" className={styles.message}>
          Thiếu ID hàng nhập kho.
        </p>
      ) : !isValidId ? (
        <p role="alert" className={styles.message}>
          ID hàng nhập kho không hợp lệ.
        </p>
      ) : error ? (
        <p role="alert" className={styles.message}>
          Không thể tải dữ liệu nhãn nguyên liệu.
        </p>
      ) : isLoading || !data ? (
        <p role="status" className={styles.message}>
          Đang tải dữ liệu nhãn...
        </p>
      ) : (
        <RawMaterialLabel key={data.id} receipt={data} />
      )}
    </main>
  );
}
