import { Button } from "@/components/ui/button";

export default function VerificationPagination({
  page,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount === 1 && page === 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className="mr-1 text-gray-600">
        Trang {page} / {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Trang trước
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
      >
        Trang sau
      </Button>
    </div>
  );
}
