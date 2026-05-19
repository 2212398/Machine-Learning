import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ className, children }: CardProps) {
  return <section className={`rounded-3xl border border-border bg-surface p-6 shadow-soft ${className || ""}`}>{children}</section>;
}
