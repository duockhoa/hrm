"use client";

import { Button } from "@/components/ui/button";

export default function CheckTypeToggle({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: "Trước sản xuất" | "Sau sản xuất") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={value === "Trước sản xuất" ? "default" : "outline"}
        disabled={disabled}
        onClick={() => onChange("Trước sản xuất")}
      >
        Trước sản xuất
      </Button>
      <Button
        type="button"
        variant={value === "Sau sản xuất" ? "default" : "outline"}
        disabled={disabled}
        onClick={() => onChange("Sau sản xuất")}
      >
        Sau sản xuất
      </Button>
    </div>
  );
}
