"use client";

import { Button } from "@/components/ui/button";

export default function DirectoryLoadStatus({
  loading,
  error,
  label,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  label: string;
  onRetry: () => void;
}) {
  if (error)
    return (
      <div role="alert" className="p-2 text-sm text-red-600">
        Không thể tải {label}.
        <Button type="button" variant="link" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  return loading ? (
    <p role="status" className="p-2 text-sm text-gray-500">
      Đang tải {label}...
    </p>
  ) : null;
}
