import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLElement> & {
  className?: string;
}>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <section
      className={cn("rounded-lg border border-border bg-surface p-6 shadow-soft", className)}
      {...props}
    >
      {children}
    </section>
  );
}
