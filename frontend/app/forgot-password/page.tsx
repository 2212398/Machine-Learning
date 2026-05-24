import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-[#1e2235] p-6 text-center text-white shadow-lg">
        <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
        <p className="text-sm leading-6 text-white/70">
          Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
        </p>
        <input
          className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/45"
          placeholder="email@example.com"
          type="email"
        />
        <button className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary-light" type="button">
          Gửi link đặt lại
        </button>
        <Link
          className="block text-sm font-semibold text-primary-light hover:underline"
          href="/sign-in"
          title="Quay lại trang đăng nhập"
        >
          ← Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}
