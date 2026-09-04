import { Suspense } from "react";
import SemiFinishedProductLabelPage from "./semi-finished-product-label-page";

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <SemiFinishedProductLabelPage />
    </Suspense>
  );
}
