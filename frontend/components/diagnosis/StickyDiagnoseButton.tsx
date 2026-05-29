"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";

export function StickyDiagnoseButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Hydration guard: scroll position is browser-only, so the server and first client render both start hidden.
    const handleScroll = () => setShow(window.scrollY > 400);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!show) {
    return null;
  }

  return (
    <a
      className="fixed bottom-4 left-3 right-3 z-50 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white shadow-lg transition hover:bg-primary-light active:scale-[0.98] sm:hidden"
      href="/dashboard/diagnosis"
      title="Bắt đầu chẩn đoán bệnh cây"
    >
      <Camera className="h-5 w-5" aria-hidden="true" />
      Chẩn đoán ngay
    </a>
  );
}
