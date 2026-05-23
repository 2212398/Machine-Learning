"use client";

import { toast, type ToastType, useToasts } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { vi } from "@/lib/vi";

const toastStyles: Record<ToastType, { icon: string; className: string }> = {
  success: { icon: "OK", className: "border-success bg-success/10 text-green-900" },
  error: { icon: "X", className: "border-danger bg-danger/10 text-red-900" },
  warning: { icon: "!", className: "border-warning bg-warning/10 text-amber-900" },
  info: { icon: "i", className: "border-primary bg-primary/10 text-primary" },
};

export function ToastContainer() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[80] flex flex-col gap-3 sm:left-auto sm:right-4 sm:w-96"
    >
      {toasts.map((toastItem) => {
        const style = toastStyles[toastItem.type];

        return (
          <div
            className={cn(
              "animate-[toastIn_180ms_ease-out] rounded-lg border px-4 py-3 shadow-md",
              "flex items-start gap-3 bg-white/95 backdrop-blur",
              style.className,
            )}
            key={toastItem.id}
            role="status"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-sm sm:text-xs font-bold"
            >
              {style.icon}
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium leading-5">{toastItem.message}</p>
            <button
              aria-label={vi.common.close}
              className="min-h-[44px] min-w-[44px] rounded p-1 text-current opacity-70 transition hover:bg-white/60 hover:opacity-100"
              onClick={() => toast.dismiss(toastItem.id)}
              type="button"
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}
