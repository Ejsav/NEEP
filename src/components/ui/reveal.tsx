"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Entrance motion for below-the-fold content.
 *
 * An IntersectionObserver rather than an animation library: the whole effect is
 * one transform and one opacity, which CSS already does on the compositor.
 * Framer Motion would cost ~35KB gzipped to reproduce a keyframe we can write in
 * four lines, and the route budget in PLAN.md has no room for that.
 *
 * Drives the DOM attribute directly instead of holding React state. Two reasons:
 * a scroll reveal causes zero re-renders this way, and setting state
 * synchronously in an effect is exactly the cascading-render pattern React 19
 * lints against.
 *
 * The hidden state is applied only once the observer is running, so content is
 * never hidden by CSS that JavaScript then fails to undo. With JavaScript
 * disabled, or with prefers-reduced-motion set, children render in their final
 * position with no animation at all - honoured, not shortened.
 */

type RevealProps = {
  children: ReactNode;
  /** Stagger, in milliseconds, for items revealed as a group. */
  delayMs?: number;
  as?: ElementType;
  className?: string;
};

export function Reveal({
  children,
  delayMs = 0,
  as: Tag = "div",
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    node.dataset.reveal = "hidden";
    if (delayMs > 0) node.style.transitionDelay = `${delayMs}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          node.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delayMs]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
