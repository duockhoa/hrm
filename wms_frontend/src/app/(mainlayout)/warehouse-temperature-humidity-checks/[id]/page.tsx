import { notFound } from "next/navigation";
import CheckPage from "@/features/warehouse-temperature-humidity-checks/check-page";

export default async function CheckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const checkId = Number(id);
  if (
    !/^\d+$/.test(id) ||
    !Number.isSafeInteger(checkId) ||
    checkId <= 0 ||
    checkId > 2147483647
  )
    notFound();
  return <CheckPage key={checkId} initialId={checkId} />;
}
