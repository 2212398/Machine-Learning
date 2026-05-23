"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const signInSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    setFormError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setFormError("Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.");
      return;
    }

    router.refresh();
    router.push("/dashboard");
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {formError ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-800" role="alert">
          {formError}
        </div>
      ) : null}

      <label className="block space-y-2 text-sm font-medium text-neutral-800">
        <span>{t.auth.email}</span>
        <Input
          aria-describedby={errors.email ? "sign-in-email-error" : undefined}
          aria-invalid={!!errors.email}
          autoComplete="email"
          placeholder="email@example.com"
          type="email"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-danger" id="sign-in-email-error">
            {errors.email.message}
          </p>
        ) : null}
      </label>

      <label className="block space-y-2 text-sm font-medium text-neutral-800">
        <span>{t.auth.password}</span>
        <div className="relative">
          <Input
            aria-describedby={errors.password ? "sign-in-password-error" : undefined}
            aria-invalid={!!errors.password}
            autoComplete="current-password"
            className="pr-24"
            placeholder="Nhập mật khẩu"
            type={showPassword ? "text" : "password"}
            {...register("password")}
          />
          <button
            aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
            className="absolute right-3 top-1/2 min-h-[44px] min-w-[44px] -translate-y-1/2 text-sm font-semibold text-primary"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? t.common.close : t.auth.showPassword}
          </button>
        </div>
        {errors.password ? (
          <p className="text-sm text-danger" id="sign-in-password-error">
            {errors.password.message}
          </p>
        ) : null}
      </label>

      <Button className="w-full" disabled={isSubmitting} loading={isSubmitting} size="lg" type="submit">
        {t.auth.signIn}
      </Button>

      <p className="text-center text-sm text-neutral-600">
        {t.auth.noAccount}{" "}
        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/sign-up">
          {t.auth.signUp}
        </Link>
      </p>
    </form>
  );
}
