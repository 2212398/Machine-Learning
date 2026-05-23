import type { HTMLAttributes, PropsWithChildren } from "react";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLElement> & {
  className?: string;
}>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <section
      className={`rounded-3xl border border-border bg-surface p-6 shadow-soft ${className || ""}`}
      {...props}
    >
      {children}
    </section>
  );
}
