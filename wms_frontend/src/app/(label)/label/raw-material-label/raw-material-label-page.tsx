"use client";

import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useWarehouseReceiptAccess } from "@/hooks/use-warehouse-receipt-access";
import RawMaterialLabel from "@/features/warehouse-receipt-items/raw-material-label";
import warehouseReceiptItemsService, {
  WAREHOUSE_RECEIPT_ITEMS_URL,
} from "@/services/warehouse-receipt-items.service";
import styles from "@/features/warehouse-receipt-items/raw-material-label.module.css";

export default function RawMaterialLabelPage() {
  const access = useWarehouseReceiptAccess();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const receiptId = Number(id);
  const isValidId =
    /^\d+$/.test(id) &&
    Number.isSafeInteger(receiptId) &&
    receiptId > 0 &&
    receiptId <= 2147483647;
  const { data, error, isLoading } = useSWR(
    isValidId && access.canRead
      ? [`${WAREHOUSE_RECEIPT_ITEMS_URL}/${receiptId}`, access.cacheScope]
      : null,
    () => warehouseReceiptItemsService.read(receiptId),
    { revalidateOnFocus: false },
  );

  return (
    <main className={styles.page}>
      {access.loading ? (
        <p role="status" className={styles.message}>
          Đang tải quyền truy cập...
        </p>
      ) : !access.canRead ? (
        <p role="alert" className={styles.message}>
          Bạn không có quyền xem kiểm hàng nhập kho.
        </p>
      ) : !id ? (
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
