import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <section className="page-shell grid min-h-[calc(100vh-160px)] items-center py-8">
      <div className="grid overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-md lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden bg-gradient-to-br from-primary to-primary-light p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/80">Plant Detec</p>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight">
              Phát hiện sớm, bảo vệ mùa vụ.
            </h1>
          </div>
          <blockquote className="font-display text-2xl italic leading-9 text-white/90">
            "Chẩn đoán sớm, cứu mùa vàng."
          </blockquote>
        </aside>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md space-y-8">
            <div>
              <h1 className="font-display text-3xl font-semibold text-neutral-900">Đăng nhập</h1>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Đăng nhập để xem lịch sử, phản hồi và các báo cáo bệnh cây đã lưu.
              </p>
            </div>
            <SignInForm />
          </div>
        </div>
      </div>
    </section>
  );
}
