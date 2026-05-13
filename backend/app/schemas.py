from pydantic import BaseModel, Field


class RecommendationChecklist(BaseModel):
    immediate: list[str] = Field(default_factory=list)
    monitor: list[str] = Field(default_factory=list)
    consult: list[str] = Field(default_factory=list)


class PredictResponse(BaseModel):
    plant_label: str
    plant_confidence: float
    disease_label: str
    disease_confidence: float
    step1_done: bool = True
    step2_done: bool = True
    step2_allowed_classes: int = 0
    inference_mode: str = "two_step"
    recommendation: str
    recommendation_checklist: RecommendationChecklist | None = None
    status: str
    message: str | None = None
    inconsistent: bool = False
    model_loaded: bool = True


class PlantCandidate(BaseModel):
    label: str
    confidence: float


class Step1PlantResponse(BaseModel):
    step1_done: bool
    plant_label: str
    plant_confidence: float
    top1_top2_margin: float = 0.0
    requires_confirmation: bool = True
    auto_confirmed: bool = False
    can_confirm: bool = False
    too_many_leaves: bool = False
    leaf_candidate_count: int = 0
    top_candidates: list[PlantCandidate] = []
    step2_access_token: str | None = None
    step2_access_expires_in_sec: int | None = None
    status: str
    message: str | None = None
    model_loaded: bool = True
    inference_mode: str = "two_step"


class Step2ImageResult(BaseModel):
    image_name: str
    leaf_detected: bool
    status: str
    message: str | None = None
    disease_label: str
    disease_confidence: float
    inconsistent: bool = False
    skipped: bool = False
    plant_mismatch: bool = False
    detected_plant_label: str | None = None
    detected_plant_confidence: float | None = None


class Step2DiseaseResponse(BaseModel):
    step2_done: bool
    plant_label: str
    image_count: int
    successful_images: int
    failed_images: int
    mismatched_plant_images: int = 0
    unverified_plant_images: int = 0
    duplicate_images: int = 0
    step2_allowed_classes: int
    final_disease_label: str
    final_disease_confidence: float
    recommendation: str
    recommendation_checklist: RecommendationChecklist | None = None
    status: str
    message: str | None = None
    model_loaded: bool = True
    inference_mode: str = "two_step"
    per_image: list[Step2ImageResult]
