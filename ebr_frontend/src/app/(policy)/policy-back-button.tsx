"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type PolicyBackButtonProps = {
  className?: string;
  feedbackUrl?: string;
};

export default function PolicyBackButton({
  className,
  feedbackUrl,
}: PolicyBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <div className={cn("flex flex-wrap justify-center gap-3", className)}>
      {feedbackUrl ? (
        <Button
          asChild
          variant="outline"
          className="w-36 border-blue-600 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
        >
          <a href={feedbackUrl}>Góp ý</a>
        </Button>
      ) : null}
      <Button
        type="button"
        className="w-36 bg-blue-600 text-white hover:bg-blue-700"
        onClick={handleBack}
      >
        OK
      </Button>
    </div>
  );
}
