"use client";

import { useEffect, useState } from "react";

export function StickyDiagnoseButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
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
      className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-primary py-3 text-center text-base font-semibold text-white shadow-lg transition-all sm:hidden"
      href="/dashboard/diagnosis"
      title="Bắt đầu chẩn đoán bệnh cây"
    >
      📷 Chẩn đoán ngay
    </a>
  );
}
