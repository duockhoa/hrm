"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemAppProps = {
  link: string;
  name: string;
  icon?: ReactNode;
  className?: string;
  tileClassName?: string;
  external?: boolean;
  disabled?: boolean;
};

export default function ItemApp({
  link,
  name,
  icon,
  className,
  tileClassName,
  external,
  disabled = false,
}: ItemAppProps) {
  const isExternal = external ?? /^https?:\/\//.test(link);
  const content = (
    <>
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-[22px] border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.28)] transition duration-200",
          disabled
            ? "bg-gradient-to-b from-gray-500 to-gray-700 grayscale"
            : "bg-[linear-gradient(180deg,#50B7FF_0%,#2F95F3_58%,#2E73ED_100%)] group-hover:-translate-y-1 group-hover:scale-[1.02] group-hover:shadow-[0_16px_28px_rgba(0,0,0,0.34)]",
          !disabled && tileClassName,
        )}
      >
        {icon ?? <Clock3 className="size-10 text-white" strokeWidth={2.4} />}
      </div>

      <span
        className={cn(
          "text-sm font-semibold leading-tight tracking-[0.01em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] md:text-[15px]",
          disabled ? "text-gray-400" : "text-white",
        )}
      >
        {name}
      </span>
    </>
  );

  const wrapperClassName = cn(
    "group flex w-[132px] flex-col items-center gap-3 text-center",
    disabled && "cursor-not-allowed opacity-70",
    className,
  );

  if (disabled) {
    return (
      <div
        aria-label={`${name} - Chưa được cấp quyền truy cập`}
        aria-disabled="true"
        title="Bạn chưa được cấp quyền truy cập ứng dụng này"
        className={wrapperClassName}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={link}
      aria-label={name}
      rel={isExternal ? "noreferrer noopener" : undefined}
      target={isExternal ? "_blank" : undefined}
      className={wrapperClassName}
    >
      {content}
    </Link>
  );
}
