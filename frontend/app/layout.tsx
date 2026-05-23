import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/ui/ToastContainer";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chẩn Đoán Cây AI",
  description: "Ứng dụng AI chẩn đoán bệnh cây từ ảnh lá cây.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className="font-body">
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1e2235]/95 text-white backdrop-blur">
            <div className="page-shell flex items-center justify-between py-4">
              <Link href="/" className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                  Chẩn Đoán Cây AI
                </span>
              </Link>

              <nav className="flex items-center gap-2">
                <Button className="min-h-[48px] px-5 text-base text-white hover:bg-white/10" href="/sign-in" variant="ghost">
                  Đăng nhập
                </Button>
                <Button className="min-h-[48px] px-5 text-base" href="/sign-up">Tạo tài khoản</Button>
              </nav>
            </div>
          </header>

          <Providers>
            <main className="pb-16 pt-8">{children}</main>
            <ToastContainer />
          </Providers>
        </div>
      </body>
    </html>
  );
}
