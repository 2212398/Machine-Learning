import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hệ thống Nhận diện Bệnh trên Lá Cây",
  description: "Next.js + Supabase frontend scaffold for the plant leaf disease project.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className={beVietnamPro.className}>
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur">
            <div className="page-shell flex items-center justify-between py-4">
              <Link href="/" className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Plant Leaf AI</span>
                <span className="text-xs text-muted">Next.js + Supabase + FastAPI</span>
              </Link>

              <nav className="flex items-center gap-2">
                <Button href="/sign-in" variant="ghost">
                  Đăng nhập
                </Button>
                <Button href="/sign-up">Tạo tài khoản</Button>
              </nav>
            </div>
          </header>

          <main className="pb-16 pt-8">{children}</main>
        </div>
      </body>
    </html>
  );
}