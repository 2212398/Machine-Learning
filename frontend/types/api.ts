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

export interface PlantCandidate {
  label: string;
  confidence: number;
}

export interface Step1PlantResponse {
  step1_done: boolean;
  plant_label: string;
  plant_confidence: number;
  top1_top2_margin?: number;
  requires_confirmation: boolean;
  auto_confirmed: boolean;
  can_confirm: boolean;
  too_many_leaves?: boolean;
  leaf_candidate_count?: number;
  top_candidates: PlantCandidate[];
  step2_access_token?: string | null;
  step2_access_expires_in_sec?: number | null;
  status: string;
  message?: string | null;
  model_loaded?: boolean;
  inference_mode?: string;
}

export interface Step2DiseaseResponse {
  step2_done: boolean;
  plant_label: string;
  image_count: number;
  successful_images: number;
  failed_images: number;
  final_disease_label: string;
  final_disease_confidence: number;
  recommendation?: string;
  status: string;
  message?: string | null;
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
