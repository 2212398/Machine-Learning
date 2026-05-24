import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { LogoutButton } from "@/components/auth/logout-button";
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
  const userLabel = user?.email?.split("@")[0] || user?.user_metadata?.full_name || "";
  const avatarLabel = (user?.email?.[0] || userLabel[0] || "U").toUpperCase();

  return (
    <html lang="vi">
      <body className="font-body">
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1e2235]/95 text-white backdrop-blur">
            <div className="page-shell flex h-14 items-center justify-between sm:h-16">
              <Link href="/" className="flex items-center gap-2 font-bold" title="Về trang chủ Plant Detec">
                <span className="text-xl" aria-hidden="true">🌿</span>
                <span className="hidden text-sm font-bold tracking-wide sm:block">
                  CHẨN ĐOÁN CÂY AI
                </span>
                <span className="text-sm font-bold tracking-wide sm:hidden">
                  CÂY AI
                </span>
              </Link>

              <nav className="flex items-center gap-2 sm:gap-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
                        {avatarLabel}
                      </div>
                      {userLabel ? (
                        <span className="hidden max-w-[160px] truncate text-sm text-gray-300 md:block">
                          {userLabel}
                        </span>
                      ) : null}
                    </div>
                    <Link
                      className="hidden rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/10 sm:block"
                      href="/dashboard"
                      title="Mở trang chủ dashboard"
                    >
                      Trang chủ
                    </Link>
                    <LogoutButton />
                  </>
                ) : (
                  <>
                    <Link
                      className="flex min-h-[40px] items-center px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                      href="/sign-in"
                      title="Đăng nhập vào tài khoản"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      className="flex min-h-[40px] items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                      href="/sign-up"
                      title="Tạo tài khoản mới miễn phí"
                    >
                      Tạo tài khoản
                    </Link>
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
