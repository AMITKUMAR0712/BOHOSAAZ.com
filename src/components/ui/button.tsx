import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-95 shadow-[var(--shadowBtn)] hover:shadow-[var(--shadowBtnHover)]",
  outline:
    "border border-primary/60 bg-transparent text-foreground hover:bg-muted/50",
  soft: "bg-secondary text-secondary-foreground hover:brightness-98 border border-border",
  ghost: "bg-transparent text-foreground hover:bg-muted/50",
  danger: "bg-danger text-danger-foreground hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4",
  lg: "h-11 px-5 text-base",
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
