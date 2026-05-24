import type { RecommendationDetail } from "@/types/api";

export const PLANT_NAME_VI: Record<string, string> = {
  Apple: "Táo",
  Blueberry: "Việt quất",
  Cherry: "Anh đào",
  "Cherry_(including_sour)": "Anh đào chua",
  Corn: "Ngô",
  "Corn_(maize)": "Ngô",
  Grape: "Nho",
  Orange: "Cam",
  Peach: "Đào",
  Pepper: "Ớt chuông",
  "Pepper,_bell": "Ớt chuông",
  Potato: "Khoai tây",
  Raspberry: "Mâm xôi",
  Rice: "Lúa",
  Soybean: "Đậu nành",
  Squash: "Bí ngô",
  Strawberry: "Dâu tây",
  Tomato: "Cà chua",
};

export const DISEASE_NAME_VI: Record<string, string> = {
  healthy: "✅ Khỏe mạnh",
  Healthy: "✅ Khỏe mạnh",
  "Apple scab": "Ghẻ táo",
  "Black rot": "Thối đen",
  "Cedar apple rust": "Gỉ sắt táo-bách xù",
  "Powdery mildew": "Phấn trắng",
  "Cercospora leaf spot Gray leaf spot": "Đốm lá xám Cercospora",
  "Common rust": "Gỉ sắt thông thường",
  "Northern Leaf Blight": "Cháy lá phương Bắc",
  "Black Measles": "Sởi đen (Esca)",
  "Isariopsis Leaf Spot": "Đốm lá Isariopsis",
  "Leaf blight": "Cháy lá",
  Haunglongbing: "Greening (Vàng lá gân xanh)",
  "Bacterial spot": "Đốm vi khuẩn",
  "Early blight": "Bệnh sớm bạc",
  "Late blight": "Bệnh muộn (mốc sương)",
  "Leaf Mold": "Mốc lá",
  "Septoria leaf spot": "Đốm lá Septoria",
  "Spider mites Two-spotted spider mite": "Nhện đỏ hai chấm",
  "Target Spot": "Đốm vòng tâm",
  "Tomato Yellow Leaf Curl Virus": "Virus xoăn vàng lá",
  "Tomato mosaic virus": "Virus khảm cà chua",
  "Leaf scorch": "Cháy mép lá",
  "Brown spot": "Đốm nâu",
  Blast: "Đạo ôn",
  "Bacterial Leaf Blight": "Bạc lá vi khuẩn",
  Tungro: "Vàng lùn lúa lùn xoắn lá",
  Hispa: "Sâu đục lá (Hispa)",
};

export type Severity = "healthy" | "mild" | "severe" | "unknown";

export const severityConfig: Record<Severity, { badge: string; color: string; bar: string }> = {
  healthy: {
    badge: "🌱 Khỏe mạnh",
    color: "bg-green-100 text-green-800 border-green-200",
    bar: "bg-green-500",
  },
  mild: {
    badge: "⚠️ Bệnh nhẹ",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    bar: "bg-amber-500",
  },
  severe: {
    badge: "🚨 Bệnh nặng",
    color: "bg-red-100 text-red-800 border-red-200",
    bar: "bg-red-500",
  },
  unknown: {
    badge: "❓ Không rõ",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    bar: "bg-gray-400",
  },
};

export function getPlantDisplayName(label: string): string {
  return PLANT_NAME_VI[label] ?? label;
}

export function extractDiseasePart(label: string): string {
  const parts = label.split("___");
  return parts.length > 1 ? parts[1] : label;
}

export function formatDiseaseName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bOf\b/g, "of")
    .replace(/\bAnd\b/g, "and")
    .trim();
}

export function getDiseaseDisplayName(label: string): string {
  const raw = extractDiseasePart(label);
  const formatted = formatDiseaseName(raw);
  return DISEASE_NAME_VI[raw] ?? DISEASE_NAME_VI[formatted] ?? formatted;
}

export function getSeverity(diseaseLabel: string, confidence: number): Severity {
  const raw = extractDiseasePart(diseaseLabel).toLowerCase();
  if (raw === "healthy") {
    return "healthy";
  }
  if (confidence >= 0.85) {
    return "severe";
  }
  if (confidence >= 0.6) {
    return "mild";
  }
  return "unknown";
}

export function parseRecommendation(rec: RecommendationDetail | string | null | undefined): RecommendationDetail {
  if (!rec) {
    return {
      ten_benh: "",
      nguyen_nhan: "",
      trieu_chung: "",
      xu_ly: [],
      phong_ngua: [],
      muc_do: "unknown",
      thoi_gian_xu_ly: "",
    };
  }

  if (typeof rec === "string") {
    try {
      const parsed = JSON.parse(rec) as Partial<RecommendationDetail>;
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.xu_ly)) {
        return {
          ten_benh: parsed.ten_benh ?? "",
          nguyen_nhan: parsed.nguyen_nhan ?? "",
          trieu_chung: parsed.trieu_chung ?? "",
          xu_ly: parsed.xu_ly ?? [],
          phong_ngua: parsed.phong_ngua ?? [],
          muc_do: parsed.muc_do ?? "unknown",
          thoi_gian_xu_ly: parsed.thoi_gian_xu_ly ?? "",
        };
      }
    } catch {
      // Plain legacy recommendation text.
    }

    return {
      ten_benh: "",
      nguyen_nhan: "",
      trieu_chung: "",
      xu_ly: rec.split("\n").filter(Boolean),
      phong_ngua: [],
      muc_do: "unknown",
      thoi_gian_xu_ly: "",
    };
  }

  return rec;
}
