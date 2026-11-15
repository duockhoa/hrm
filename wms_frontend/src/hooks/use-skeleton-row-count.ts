"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onResize: () => void) => {
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
};

const getViewportHeight = () => window.innerHeight;
const getServerHeight = () => 960;

export function useSkeletonRowCount(rowHeight = 32) {
  const height = useSyncExternalStore(
    subscribe,
    getViewportHeight,
    getServerHeight,
  );
  // Cover the viewport so the loading list stays full on tall screens too.
  return Math.max(1, Math.ceil(height / rowHeight));
}
