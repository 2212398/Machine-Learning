"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        setMessage("Đã tạo tài khoản. Nếu bật xác nhận email, hãy kiểm tra hộp thư để hoàn tất.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.refresh();
      router.push("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Đã xảy ra lỗi xác thực.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {isSignUp ? (
        <label className="block space-y-2 text-sm font-medium text-foreground">
          <span>Họ và tên</span>
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nhập họ và tên" />
        </label>
      ) : null}

      <label className="block space-y-2 text-sm font-medium text-foreground">
        <span>Email</span>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-foreground">
        <span>Mật khẩu</span>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Nhập mật khẩu"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
        />
      </label>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Đang xử lý..." : isSignUp ? "Tạo tài khoản" : "Đăng nhập"}
      </Button>

      {message ? <p className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600">{error}</p> : null}
    </form>
  );
}