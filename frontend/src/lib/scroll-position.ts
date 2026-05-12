"use client";

type ScrollPosition = {
  top: number;
  left: number;
};

const isScrollable = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const overflowX = style.overflowX;

  return (
    ((overflowY === "auto" || overflowY === "scroll") &&
      element.scrollHeight > element.clientHeight) ||
    ((overflowX === "auto" || overflowX === "scroll") &&
      element.scrollWidth > element.clientWidth)
  );
};

const getScrollableChain = (element: HTMLElement | null) => {
  const chain: HTMLElement[] = [];
  let current = element;

  while (current) {
    if (isScrollable(current)) {
      chain.push(current);
    }

    current = current.parentElement;
  }

  return chain;
};

export function saveScrollableChainPosition(
  key: string,
  element: HTMLElement | null,
) {
  if (!element) {
    return;
  }

  const positions = getScrollableChain(element).map<ScrollPosition>((node) => ({
    top: node.scrollTop,
    left: node.scrollLeft,
  }));

  sessionStorage.setItem(key, JSON.stringify(positions));
}

export function restoreScrollableChainPosition(
  key: string,
  element: HTMLElement | null,
) {
  if (!element) {
    return;
  }

  const rawPositions = sessionStorage.getItem(key);

  if (!rawPositions) {
    return;
  }

  let positions: ScrollPosition[];

  try {
    positions = JSON.parse(rawPositions);
  } catch {
    return;
  }

  const restore = () => {
    const chain = getScrollableChain(element);

    chain.forEach((node, index) => {
      const position = positions[index];

      if (!position) {
        return;
      }

      node.scrollTop = position.top;
      node.scrollLeft = position.left;
    });
  };

  restore();
  window.requestAnimationFrame(() => {
    restore();
    window.requestAnimationFrame(restore);
  });
}
