import { NextRequest, NextResponse } from "next/server";

// Mock endpoint for testing without trained models
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    // Keep test-only inference mocks out of production without changing dev workflows.
    return NextResponse.json({ error: "Không tìm thấy endpoint" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn ảnh trước." },
        { status: 400 }
      );
    }

    // Simulate inference delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return mock diagnosis result
    return NextResponse.json({
      success: true,
      plant_prediction: {
        label: "Tomato",
        confidence: 0.95,
      },
      disease_prediction: {
        label: "Tomato___Yellow_Leaf_Curl_Virus",
        confidence: 0.89,
      },
    });
  } catch (error) {
    console.error("Mock endpoint error:", error);
    return NextResponse.json(
      { error: "Không thể xử lý ảnh. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
