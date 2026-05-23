import Image from "next/image";
import { Button } from "@/components/ui/button";

const leafImages = [
  { src: "/leaf-sample-1.svg", alt: "Ảnh mẫu lá cà chua khỏe mạnh" },
  { src: "/leaf-sample-2.svg", alt: "Ảnh mẫu lá ngô" },
  { src: "/leaf-sample-3.svg", alt: "Ảnh mẫu lá nho" },
  { src: "/leaf-sample-4.svg", alt: "Ảnh mẫu lá táo" },
];

const steps = [
  {
    icon: "📷",
    number: "Bước 1",
    title: "Chụp ảnh lá cây",
    description: "Chụp hoặc chọn ảnh từ điện thoại.",
  },
  {
    icon: "🤖",
    number: "Bước 2",
    title: "AI nhận diện bệnh",
    description: "Hệ thống tự phân tích ảnh lá cây.",
  },
  {
    icon: "✅",
    number: "Bước 3",
    title: "Xem hướng điều trị",
    description: "Nhận gợi ý xử lý dễ hiểu.",
  },
];

const plants = [
  "🍅 Cà chua",
  "🌾 Lúa",
  "🌽 Ngô",
  "🥔 Khoai tây",
  "🍇 Nho",
  "🍎 Táo",
  "Ớt",
  "🍑 Đào",
  "Việt quất",
  "🍓 Dâu tây",
  "Đậu nành",
  "☕ Cà phê",
];

const reasons = [
  "✅ Kết quả trong 5 giây",
  "📱 Dùng được trên điện thoại",
  "Miễn phí",
];

export default function HomePage() {
  return (
    <div className="bg-[#1e2235] text-white">
      <section className="hero-fade-in">
        <div className="page-shell grid min-h-[calc(100vh-96px)] gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-base font-semibold text-white">
              🌿 Miễn phí · Dễ dùng
            </div>

            <div className="space-y-5">
              <h1 className="font-display text-[clamp(34px,5vw,56px)] font-semibold leading-tight text-white">
                Phát hiện bệnh cây chỉ từ 1 tấm ảnh
              </h1>
              <p className="max-w-2xl text-[20px] leading-[1.7] text-white/85 sm:text-lg">
                Chụp ảnh lá cây → AI nhận diện bệnh → Nhận hướng điều trị.
                Không cần kiến thức kỹ thuật.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="min-h-[56px] w-full text-lg sm:w-auto" href="/dashboard/diagnosis" size="lg">
                📷 Chẩn đoán ngay
              </Button>
              <Button
                className="min-h-[56px] w-full border-white/70 text-lg text-white hover:bg-white/10 sm:w-auto"
                href="#cach-dung"
                size="lg"
                variant="outline"
              >
                Xem cách dùng ↓
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {leafImages.map((image, index) => (
              <div
                className="overflow-hidden rounded-lg border border-white bg-white p-2 shadow-md odd:translate-y-6"
                key={image.src}
              >
                <Image
                  alt={image.alt}
                  className="aspect-[4/3] rounded-md object-cover"
                  height={240}
                  priority={index === 0}
                  src={image.src}
                  width={320}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-raised py-14 text-neutral-900" id="cach-dung">
        <div className="page-shell space-y-8">
          <h2 className="font-display text-3xl font-semibold">3 bước đơn giản</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article className="rounded-lg border border-neutral-100 bg-white p-6 shadow-sm" key={step.title}>
                <div className="text-[64px] leading-none">{step.icon}</div>
                <p className="mt-5 text-sm font-semibold text-neutral-400">{step.number}</p>
                <h3 className="mt-2 text-xl font-bold text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-base leading-7 text-neutral-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 text-neutral-900">
        <div className="page-shell space-y-8">
          <h2 className="font-display text-3xl font-semibold">Nhận diện được 14 loại cây phổ biến</h2>
          <div className="flex flex-wrap gap-3">
            {plants.map((plant) => (
              <span
                className="rounded-full border border-primary-pale bg-primary-pale/50 px-4 py-2 text-base font-semibold text-primary"
                key={plant}
              >
                {plant}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-raised py-14 text-neutral-900">
        <div className="page-shell space-y-8">
          <h2 className="font-display text-3xl font-semibold">Tại sao dùng app này?</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {reasons.map((reason) => (
              <div className="rounded-lg border border-neutral-100 bg-white p-6 text-xl font-bold shadow-sm" key={reason}>
                {reason}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-14 text-white">
        <div className="page-shell flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-3xl font-semibold">Thử ngay, hoàn toàn miễn phí</h2>
          <Button className="min-h-[56px] w-full bg-white text-lg text-primary hover:bg-white/90 sm:w-auto" href="/dashboard/diagnosis" size="lg">
            Bắt đầu chẩn đoán
          </Button>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#1e2235]/95 p-3 sm:hidden">
        <Button className="min-h-[56px] w-full text-lg" href="/dashboard/diagnosis" size="lg">
          📷 Chẩn đoán ngay
        </Button>
      </div>
    </div>
  );
}
