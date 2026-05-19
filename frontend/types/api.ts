// FastAPI response types
export interface PlantPrediction {
  label: string;
  confidence: number;
}

export interface DiseasePrediction {
  label: string;
  confidence: number;
}

export interface FastAPIResponse {
  plant_prediction: PlantPrediction;
  disease_prediction: DiseasePrediction;
  success: boolean;
  message?: string;
}

// Frontend diagnosis result
export interface DiagnosisResult {
  id: string;
  plant_label: string;
  plant_confidence: number;
  disease_label: string;
  disease_confidence: number;
  image_url: string;
  created_at: string;
}
