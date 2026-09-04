import type {
  LineClearanceCheckUser,
  PreviousProductionOrder,
  ProductionOrderLineClearanceCheck,
} from "./types";

const LINE_CLEARANCE_RESULTS = ["Đạt", "Không đạt"] as const;
const LINE_CLEARANCE_CHECK_TYPES = ["Trước sản xuất", "Sau sản xuất"] as const;

const LINE_CLEARANCE_REQUIREMENTS: Record<
  (typeof LINE_CLEARANCE_CHECK_TYPES)[number],
  string
> = {
  "Trước sản xuất": [
    "Sản phẩm, vật liệu: Không sản phẩm, nguyên liệu, bao bì, bán thành phẩm từ lô sản xuất trước.",
    "Tài liệu: Không còn tài liệu, hồ sơ, biểu mẫu liên quan đến lô sản xuất trước.",
    "Rác thải và phế phẩm: Không còn rác thải và phế phẩm của lô sản xuất trước.",
  ].join("\n"),
  "Sau sản xuất": [
    "Sản phẩm, vật liệu: Sản phẩm, nguyên liệu, bao bì bao gói được dọn sạch.",
    "Tài liệu: Tài liệu, hồ sơ, biểu mẫu liên quan đến lô sản xuất được tập hợp và dọn sạch.",
    "Rác thải và phế phẩm: Rác thải, phế phẩm được dọn sạch.",
  ].join("\n"),
};

const formatText = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getUserLabel = (user?: LineClearanceCheckUser | null) =>
  user?.full_name || user?.name || user?.username || user?.employee_code || "—";

const normalizeOptionalText = (value: string) => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const getProductionOrderProductName = (
  order?: PreviousProductionOrder | null,
) =>
  order?.item?.item_name ||
  order?.item_name ||
  order?.description ||
  order?.item_code ||
  null;

const getPreviousProductionOrderInfo = (
  check: ProductionOrderLineClearanceCheck,
  productionOrders: PreviousProductionOrder[] = [],
) => {
  const embeddedOrder =
    check.previousProductionOrder ?? check.previous_production_order;
  const referencedOrder = productionOrders.find(
    (order) =>
      order.id !== null &&
      order.id !== undefined &&
      String(order.id) === String(check.previous_production_order_id),
  );
  const order = embeddedOrder ?? referencedOrder;

  return {
    productName:
      getProductionOrderProductName(embeddedOrder) ??
      getProductionOrderProductName(referencedOrder),
    lotNo: check.previous_lot_no ?? order?.lot_no ?? null,
  };
};

export {
  LINE_CLEARANCE_CHECK_TYPES,
  LINE_CLEARANCE_REQUIREMENTS,
  LINE_CLEARANCE_RESULTS,
  formatDateTime,
  formatText,
  getUserLabel,
  getPreviousProductionOrderInfo,
  normalizeOptionalText,
};
