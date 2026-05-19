import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const highlights = [
  {
    title: "Frontend mới bằng Next.js App Router",
    description: "Chuẩn hóa giao diện, luồng auth và Server/Client Components để thay thế frontend HTML/JS cũ.",
  },
  {
    title: "Supabase cho Auth, Database và Storage",
    description: "Lưu lịch sử chẩn đoán, file ảnh và quyền truy cập theo user với RLS ngay từ Phase 1.",
  },
  {
    title: "Giữ nguyên AI microservice FastAPI",
    description: "Backend PyTorch + OpenCV tiếp tục là nơi suy luận plant/disease, frontend chỉ orchestration và hiển thị.",
  },
];

export default async function HomePage() {
  // Server-side fetch from Supabase for demo todos
  let todos: { id: string; name: string }[] | undefined = undefined;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("todos").select("id,name");
    todos = (data as any) ?? undefined;
  } catch (e) {
    // ignore errors for demo page
    console.warn("Could not load todos:", e);
  }
  return (
    <section className="page-shell space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-6 rounded-[2rem] border border-border bg-surface/90 p-8 shadow-soft">
          <span className="inline-flex rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
            Phase 1 - Migrate & Setup
          </span>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Hệ thống nhận diện bệnh trên lá cây, được chuẩn hóa để phát triển theo kiến trúc thật.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Bản Next.js này là nền tảng mới cho giao diện người dùng, xác thực, lịch sử chẩn đoán và tích hợp Supabase.
              AI inference vẫn nằm ở FastAPI để giữ đúng ranh giới trách nhiệm giữa UI và machine learning.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/sign-up">Bắt đầu với tài khoản mới</Button>
            <Button href="/sign-in" variant="secondary">
              Đăng nhập để tiếp tục
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm font-semibold text-brand-700">Next.js</p>
              <p className="mt-2 text-sm text-muted">App Router, Server Components và Client Components</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-brand-700">Supabase</p>
              <p className="mt-2 text-sm text-muted">Auth, Database CRUD, RLS, Storage</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-brand-700">FastAPI</p>
              <p className="mt-2 text-sm text-muted">Microservice AI với OpenCV + PyTorch</p>
            </Card>
          </div>
        </div>

        <Card className="space-y-4 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Trạng thái Phase 1</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Nền tảng sẵn sàng để phát triển tiếp</h2>
          </div>

          <div className="space-y-4">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-border bg-surfaceAlt p-4">
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-800">
            Ở giai đoạn tiếp theo, phần upload ảnh sẽ đi qua Supabase Storage trước khi request được gửi sang FastAPI.
          </div>

          <Link className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline" href="/sign-in">
            Đi tới màn hình đăng nhập
          </Link>
        
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-foreground">Demo: Todos (server-side)</h3>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {todos && todos.length > 0 ? (
                todos.map((todo) => <li key={todo.id}>{todo.name}</li>)
              ) : (
                <li className="text-muted">No todos available</li>
              )}
            </ul>
          </div>
        </Card>
      </div>
    </section>
  );
}