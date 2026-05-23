import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "healthy" | "mild" | "severe" | "unknown" | "neutral";
export type BadgeSize = "sm" | "md";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  healthy: "border-green-200 bg-green-100 text-green-800",
  mild: "border-amber-200 bg-amber-100 text-amber-800",
  severe: "border-red-200 bg-red-100 text-red-800",
  unknown: "border-gray-200 bg-gray-100 text-gray-600",
  neutral: "border-primary-pale bg-primary-pale text-primary",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-sm sm:text-xs",
  md: "px-3 py-1 text-sm",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, size = "md", icon, children, className, ...props }, ref) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold leading-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      ref={ref}
      {...props}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  ),
);

Badge.displayName = "Badge";
