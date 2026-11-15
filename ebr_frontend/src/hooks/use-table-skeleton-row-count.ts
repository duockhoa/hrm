"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onResize: () => void) => {
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
};

// Table rows are at least 32px tall; fill even the full viewport so headers
// and toolbars cannot leave an empty area below the loading rows.
const getRowCount = () => Math.max(12, Math.ceil(window.innerHeight / 32));
const getServerRowCount = () => 30;

export function useTableSkeletonRowCount() {
  return useSyncExternalStore(subscribe, getRowCount, getServerRowCount);
}
