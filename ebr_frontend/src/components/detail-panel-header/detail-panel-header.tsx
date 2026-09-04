import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default function DetailPanelHeader({
  title,
  subtitle,
  actions,
  onClose,
  showCloseButton = true,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onClose: () => void;
  showCloseButton?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4 text-left">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold text-blue-500 md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 break-words text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {showCloseButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
