import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-semibold tracking-[-0.01em] transition-all duration-200 outline-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-(--shadowBtn) hover:-translate-y-px hover:brightness-95 hover:shadow-(--shadowBtnHover)",
  outline:
    "bg-card/55 text-foreground shadow-sm backdrop-blur hover:-translate-y-px hover:bg-muted/45 hover:text-foreground",
  soft: "bg-secondary/80 text-secondary-foreground shadow-sm backdrop-blur hover:-translate-y-px hover:bg-muted/55",
  ghost: "bg-transparent text-foreground hover:bg-muted/45 hover:shadow-sm",
  danger: "bg-danger text-danger-foreground shadow-(--shadowBtn) hover:-translate-y-px hover:brightness-95 hover:shadow-(--shadowBtnHover)",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3 text-xs sm:h-9",
  md: "h-11 px-4 sm:px-5",
  lg: "h-12 px-5 text-sm sm:px-7 sm:text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
