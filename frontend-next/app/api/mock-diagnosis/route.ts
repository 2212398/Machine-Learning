import { NextRequest, NextResponse } from "next/server";

// Mock endpoint for testing without trained models
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
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
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}
