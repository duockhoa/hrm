import { Button } from "@/components/ui/button";

type PassFailResultValue = "" | "pass" | "fail";

type PassFailResultToggleProps = {
  value: PassFailResultValue;
  disabled?: boolean;
  onChange: (value: PassFailResultValue) => void;
};

export default function PassFailResultToggle({
  value,
  disabled,
  onChange,
}: PassFailResultToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-pressed={value === "pass"}
        className={
          value === "pass"
            ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
            : ""
        }
        onClick={() => onChange("pass")}
      >
        Đạt
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-pressed={value === "fail"}
        className={
          value === "fail"
            ? "border-red-600 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
            : ""
        }
        onClick={() => onChange("fail")}
      >
        Không đạt
      </Button>
    </div>
  );
}

export type { PassFailResultValue };
