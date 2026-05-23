"use client";

import { useRouter } from "next/navigation";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LogoutButtonProps = {
  className?: string;
  variant?: ButtonVariant;
};

export function LogoutButton({ className, variant = "secondary" }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button className={className} type="button" variant={variant} onClick={handleLogout}>
      Đăng xuất
    </Button>
  );
}
