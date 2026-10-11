import { Suspense } from "react";
import RawMaterialLabelPage from "./raw-material-label-page";

export default function Page() {
  return (
    <Suspense fallback={<p>Đang tải dữ liệu nhãn...</p>}>
      <RawMaterialLabelPage />
    </Suspense>
  );
}
