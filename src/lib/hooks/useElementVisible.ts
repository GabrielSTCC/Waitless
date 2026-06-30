"use client";

import { useEffect, useState, type RefObject } from "react";

export function useElementVisible(
  ref: RefObject<Element | null>,
  options?: IntersectionObserverInit,
) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      options,
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, options?.root, options?.rootMargin, options?.threshold]);

  return visible;
}
