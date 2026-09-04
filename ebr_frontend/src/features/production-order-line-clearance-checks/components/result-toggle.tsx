"use client";

import { Button } from "@/components/ui/button";

export default function ResultToggle({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: "Đạt" | "Không đạt") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={value === "Đạt" ? "default" : "outline"}
        disabled={disabled}
        onClick={() => onChange("Đạt")}
      >
        Đạt
      </Button>
      <Button
        type="button"
        variant={value === "Không đạt" ? "default" : "outline"}
        disabled={disabled}
        onClick={() => onChange("Không đạt")}
      >
        Không đạt
      </Button>
    </div>
  );
}
