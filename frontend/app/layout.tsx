import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { Navbar } from "@/components/layout/navbar";
import { ToastContainer } from "@/components/ui/ToastContainer";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plant Disease Diagnosis",
  description: "Ứng dụng AI chẩn đoán bệnh cây từ ảnh lá cây.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className="font-body">
        <div className="min-h-screen">
          <Navbar />

          <Providers>
            <main className="pb-16 pt-8">{children}</main>
            <ToastContainer />
          </Providers>
        </div>
      </body>
    </html>
  );
}
