import { Button } from "@/components/ui/button";

type HygieneResultValue = "" | "Đạt" | "Không đạt";

type HygieneResultToggleProps = {
  value: HygieneResultValue;
  disabled?: boolean;
  onChange: (value: HygieneResultValue) => void;
};

export default function HygieneResultToggle({
  value,
  disabled,
  onChange,
}: HygieneResultToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-pressed={value === "Đạt"}
        className={
          value === "Đạt"
            ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
            : ""
        }
        onClick={() => onChange("Đạt")}
      >
        Đạt
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-pressed={value === "Không đạt"}
        className={
          value === "Không đạt"
            ? "border-red-600 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
            : ""
        }
        onClick={() => onChange("Không đạt")}
      >
        Không đạt
      </Button>
    </div>
  );
}

export type { HygieneResultValue };
