import { notFound } from "next/navigation";
import VerificationRecordSplit from "@/features/verification-records/verification-record-split";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recordId = Number(id);
  if (!/^\d+$/.test(id) || recordId < 1 || recordId > 2147483647) {
    notFound();
  }
  return <VerificationRecordSplit id={recordId} />;
}
