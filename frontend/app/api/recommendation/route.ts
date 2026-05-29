export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const diseaseLabel = (url.searchParams.get("disease_label") || "").trim();
  const plantLabel = (url.searchParams.get("plant_label") || "").trim();

  if (!diseaseLabel || !plantLabel) {
    return Response.json(
      { detail: "Thiếu tên cây hoặc tên bệnh." },
      { status: 400 }
    );
  }

  const fastApiBase = (process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000").replace(
    /\/+$/,
    ""
  );

  const backendUrl = `${fastApiBase}/api/recommendation?disease_label=${encodeURIComponent(
    diseaseLabel
  )}&plant_label=${encodeURIComponent(plantLabel)}`;

  try {
    const res = await fetch(backendUrl, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // Keep backend details in server logs; do not expose internals to the browser.
      console.error("[Recommendation] Backend error:", { status: res.status, detail: text.slice(0, 500) });
      return Response.json(
        { detail: "Không thể tải khuyến nghị. Vui lòng thử lại." },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data, { status: 200 });
  } catch (err) {
    // Network errors may contain internal hostnames, so return a stable Vietnamese message.
    console.error("[Recommendation] Request failed:", err);
    return Response.json(
      {
        detail: "Không thể kết nối máy chủ khuyến nghị.",
      },
      { status: 502 }
    );
  }
}
