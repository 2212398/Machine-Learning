import Image from "next/image";
import { Camera, CheckCircle2, ChevronDown, Leaf, Microscope, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { StickyDiagnoseButton } from "@/components/diagnosis/StickyDiagnoseButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const samples = [
  { src: "/leaf-sample-1.svg", label: "Lá cà chua" },
  { src: "/leaf-sample-2.svg", label: "Lá khoai tây" },
  { src: "/leaf-sample-3.svg", label: "Lá nho" },
  { src: "/leaf-sample-4.svg", label: "Lá ngô" },
];

const steps = [
  {
    icon: Camera,
    number: "01",
    title: "Chụp một lá rõ nét",
    description: "Ưu tiên ánh sáng tự nhiên, lấy trọn phần lá có triệu chứng.",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "AI nhận diện cây",
    description: "Hệ thống xác định loại cây trước để giảm nhầm bệnh.",
  },
  {
    icon: ShieldCheck,
    number: "03",
    title: "Nhận hướng xử lý",
    description: "Xem mức độ bệnh, độ tin cậy và gợi ý chăm sóc dễ làm.",
  },
];

const plants = ["Táo", "Anh đào", "Ngô", "Nho", "Đào", "Ớt chuông", "Khoai tây", "Dâu tây", "Cà chua"];

const reasons = [
  { icon: Zap, title: "Nhanh trong vài giây", description: "Tối ưu cho thao tác chụp ảnh và xem kết quả ngay trên điện thoại." },
  { icon: Leaf, title: "Tập trung vào lá cây", description: "Luồng chẩn đoán yêu cầu ảnh rõ, giúp kết quả ổn định hơn." },
  { icon: Microscope, title: "Có độ tin cậy", description: "Hiển thị tỉ lệ nhận diện cây và bệnh để người dùng tự đối chiếu." },
];

export default function HomePage() {
  return (
    <div className="-mt-8 bg-[#f7faf7] text-neutral-900">
      <section className="border-b border-emerald-900/10 bg-[#17291f] text-white">
        <div className="page-shell grid gap-8 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-emerald-50">
              <Leaf className="h-4 w-4" aria-hidden="true" />
              Chẩn đoán bệnh cây miễn phí
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Phát hiện bệnh cây từ một ảnh lá
              </h1>
              <p className="max-w-2xl text-base leading-7 text-emerald-50/85 sm:text-lg">
                Chụp ảnh lá cây, để AI nhận diện loại cây và xem hướng xử lý phù hợp. Trải nghiệm được tối ưu cho người dùng mở web trên điện thoại ngoài vườn.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="min-h-[56px] w-full bg-white text-base text-primary hover:bg-emerald-50 sm:w-auto"
                href="/dashboard/diagnosis"
                icon={<Camera className="h-5 w-5" aria-hidden="true" />}
                size="lg"
                title="Bắt đầu chẩn đoán bệnh cây"
              >
                Chẩn đoán ngay
              </Button>
              <Button
                className="min-h-[56px] w-full border-white/25 bg-white/5 text-base text-white shadow-none hover:bg-white/10 sm:w-auto"
                href="#cach-dung"
                icon={<ChevronDown className="h-5 w-5" aria-hidden="true" />}
                size="lg"
                title="Xem cách sử dụng"
                variant="outline"
              >
                Xem cách dùng
              </Button>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible md:pb-0">
            {samples.map((sample, index) => (
              <div
                className="group w-[164px] shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/10 p-2 shadow-lg transition duration-200 hover:-translate-y-1 hover:bg-white/15 md:w-auto md:shrink"
                key={sample.src}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-emerald-50">
                  <Image
                    alt={sample.label}
                    className="object-cover transition duration-300 group-hover:scale-105"
                    fill
                    priority={index < 2}
                    src={sample.src}
                  />
                </div>
                <p className="px-1 pt-2 text-sm font-semibold text-emerald-50">{sample.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 text-neutral-900 md:py-16" id="cach-dung">
        <div className="page-shell space-y-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Quy trình</p>
            <h2 className="font-display text-3xl font-semibold">3 bước chẩn đoán trên điện thoại</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <Card className="space-y-4 p-5 transition duration-200 hover:-translate-y-1 hover:shadow-md" key={step.title}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-pale text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-sm font-bold text-neutral-400">{step.number}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">{step.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-surface-raised py-12 text-neutral-900 md:py-16">
        <div className="page-shell grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Dữ liệu mẫu</p>
            <h2 className="font-display text-3xl font-semibold">Nhận diện 9 loại cây phổ biến</h2>
            <p className="text-sm leading-6 text-neutral-600">Danh sách được trình bày dạng nhãn để người dùng quét nhanh trên màn hình nhỏ.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {plants.map((plant) => (
              <span className="rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm" key={plant}>
                {plant}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 text-neutral-900 md:py-16">
        <div className="page-shell space-y-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Trải nghiệm</p>
            <h2 className="font-display text-3xl font-semibold">Thiết kế cho thao tác nhanh ngoài thực tế</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {reasons.map((reason) => {
              const Icon = reason.icon;

              return (
                <Card className="space-y-3 p-5" key={reason.title}>
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-neutral-900">{reason.title}</h3>
                  <p className="text-sm leading-6 text-neutral-600">{reason.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-primary py-10 text-white">
        <div className="page-shell flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Sẵn sàng kiểm tra?</p>
            <h2 className="mt-1 font-display text-3xl font-semibold">Chụp lá cây và nhận kết quả</h2>
          </div>
          <Button
            className="min-h-[56px] w-full bg-white text-base text-primary hover:bg-white/90 sm:w-auto"
            href="/dashboard/diagnosis"
            icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
            size="lg"
            title="Bắt đầu chẩn đoán bệnh cây"
          >
            Bắt đầu chẩn đoán
          </Button>
        </div>
      </section>

      <StickyDiagnoseButton />
    </div>
  );
}
