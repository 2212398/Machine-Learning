import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "min-h-[48px] w-full rounded-xl border border-border bg-white px-4 py-3 text-base text-foreground outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className || "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
