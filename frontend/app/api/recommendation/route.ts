export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const diseaseLabel = (url.searchParams.get("disease_label") || "").trim();
  const plantLabel = (url.searchParams.get("plant_label") || "").trim();

  if (!diseaseLabel || !plantLabel) {
    return Response.json(
      { detail: "Missing disease_label or plant_label" },
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
      return Response.json(
        { detail: text || `FastAPI error (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data, { status: 200 });
  } catch (err) {
    return Response.json(
      {
        detail:
          err instanceof Error
            ? err.message
            : "Could not reach backend for recommendation",
      },
      { status: 502 }
    );
  }
}
