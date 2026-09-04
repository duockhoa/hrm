"use client";

import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";

export default function DetailRawMaterialHeader({
  rawMaterial,
  onOpenMixingActivityTemplates,
}: {
  rawMaterial: any;
  onOpenMixingActivityTemplates?: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex w-full justify-between border-b border-gray-200 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link className="shrink-0" href="/raw-materials">
          Danh mục nguyên liệu
        </Link>
        <AiOutlineRight className="shrink-0" />
        <p className="truncate">{rawMaterial?.item_code}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          className="h-9 bg-gray-950 px-3 text-white hover:bg-gray-800"
          disabled={!rawMaterial}
          onClick={onOpenMixingActivityTemplates}
        >
          <FileText className="size-4" />
          BM Pha chế
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => router.push("/raw-materials")}
          aria-label="Thoát detail"
        >
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
