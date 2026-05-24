import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { getCurrentUser } from "@/lib/supabase/server";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Plant Detec — Nhận diện bệnh cây từ ảnh",
    template: "%s | Plant Detec",
  },
  description:
    "Ứng dụng AI nhận diện bệnh cây trồng từ ảnh lá. Hỗ trợ nhiều loại cây và bệnh phổ biến. Kết quả nhanh, dễ dùng, miễn phí.",
  keywords: ["nhận diện bệnh cây", "AI nông nghiệp", "chẩn đoán cây trồng", "bệnh lúa", "bệnh cà chua"],
  authors: [{ name: "Plant Detec" }],
  openGraph: {
    title: "Plant Detec",
    description: "Nhận diện bệnh cây từ 1 tấm ảnh — nhanh, dễ dùng, miễn phí.",
    url: "https://plantdetec.duckdns.org",
    siteName: "Plant Detec",
    locale: "vi_VN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = await getCurrentUser();
  const userLabel = user?.email || user?.user_metadata?.full_name;

  return (
    <html lang="vi">
      <body className="font-body">
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1e2235]/95 text-white backdrop-blur">
            <div className="page-shell flex items-center justify-between py-4">
              <Link href="/" className="flex flex-col gap-0.5" title="Về trang chủ Plant Detec">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                  Plant Detec
                </span>
              </Link>

              <nav className="flex items-center gap-2">
                {user ? (
                  <>
                    {userLabel ? (
                      <span className="hidden max-w-[220px] truncate text-sm font-semibold text-white/80 sm:block">
                        {userLabel}
                      </span>
                    ) : null}
                    <Button
                      className="min-h-[48px] px-5 text-base text-white hover:bg-white/10"
                      href="/dashboard"
                      title="Mở trang chủ dashboard"
                      variant="ghost"
                    >
                      Trang chủ
                    </Button>
                    <LogoutButton className="min-h-[48px] px-5 text-base" />
                  </>
                ) : (
                  <>
                    <Button
                      className="min-h-[48px] px-5 text-base text-white hover:bg-white/10"
                      href="/sign-in"
                      title="Đăng nhập vào tài khoản"
                      variant="ghost"
                    >
                      Đăng nhập
                    </Button>
                    <Button className="min-h-[48px] px-5 text-base" href="/sign-up" title="Tạo tài khoản mới miễn phí">
                      Tạo tài khoản
                    </Button>
                  </>
                )}
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
