import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <section className="page-shell grid place-items-center py-8">
      <Card className="w-full max-w-lg space-y-6 p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Authentication</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Tạo tài khoản</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Tài khoản mới sẽ được gắn với hồ sơ Supabase và dùng cho lịch sử chẩn đoán, ảnh upload và phản hồi.
          </p>
        </div>

        <AuthForm mode="sign-up" />
      </Card>
    </section>
  );
}