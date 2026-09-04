import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * One button, three intents.
 *
 * Hover is a designed state - colour shift plus a 1px lift - never a bare
 * opacity change. Movement is transform-only so it composites on the GPU.
 * Minimum target height is 44px, which is comfortable on a phone and meets
 * WCAG 2.2 target-size guidance.
 */

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "lg";

const base = [
  "inline-flex items-center justify-center gap-2 rounded-md font-medium",
  "transition duration-150 ease-out-quiet",
  "active:translate-y-px",
  "disabled:pointer-events-none disabled:opacity-55",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
].join(" ");

const variants: Record<Variant, string> = {
  primary: [
    "bg-accent text-accent-ink shadow-subtle",
    "hover:bg-accent-hover hover:-translate-y-px hover:shadow-raised",
  ].join(" "),
  secondary: [
    "border border-line-strong bg-paper-raised text-ink",
    "hover:border-accent hover:text-accent hover:-translate-y-px",
  ].join(" "),
  quiet: [
    "text-ink-muted underline decoration-line-strong underline-offset-4",
    "hover:text-accent hover:decoration-accent",
  ].join(" "),
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-small",
  lg: "min-h-13 px-7 text-body",
};

function classesFor(variant: Variant, size: Size, className?: string) {
  return [
    base,
    variants[variant],
    variant === "quiet" ? "" : sizes[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={classesFor(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={classesFor(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
