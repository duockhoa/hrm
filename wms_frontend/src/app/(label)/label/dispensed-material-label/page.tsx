import { Suspense } from "react";
import DispensedMaterialLabelPage from "./dispensed-material-label-page";

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <DispensedMaterialLabelPage />
    </Suspense>
  );
}
