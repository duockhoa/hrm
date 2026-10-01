import { notFound } from "next/navigation";
import ReceiptPage from "@/features/warehouse-receipt-items/receipt-page";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receiptId = Number(id);
  if (
    !/^\d+$/.test(id) ||
    !Number.isSafeInteger(receiptId) ||
    receiptId <= 0 ||
    receiptId > 2147483647
  )
    notFound();
  return <ReceiptPage key={receiptId} initialId={receiptId} />;
}
