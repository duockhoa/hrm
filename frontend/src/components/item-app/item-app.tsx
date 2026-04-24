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
};

export default function ItemApp({
  link,
  name,
  icon,
  className,
  tileClassName,
  external,
}: ItemAppProps) {
  const isExternal = external ?? /^https?:\/\//.test(link);

  return (
    <Link
      href={link}
      aria-label={name}
      rel={isExternal ? "noreferrer noopener" : undefined}
      target={isExternal ? "_blank" : undefined}
      className={cn(
        "group flex w-[132px] flex-col items-center gap-3 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,#50B7FF_0%,#2F95F3_58%,#2E73ED_100%)] shadow-[0_12px_24px_rgba(0,0,0,0.28)] transition duration-200 group-hover:-translate-y-1 group-hover:scale-[1.02] group-hover:shadow-[0_16px_28px_rgba(0,0,0,0.34)]",
          tileClassName,
        )}
      >
        {icon ?? <Clock3 className="size-10 text-white" strokeWidth={2.4} />}
      </div>

      <span className="text-sm font-semibold leading-tight tracking-[0.01em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] md:text-[15px]">
        {name}
      </span>
    </Link>
  );
}
