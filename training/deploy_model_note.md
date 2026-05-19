# Deploy Model Note

You train two MobileNetV3 models for experimentation and benchmarking:

1. plant_mobilenetv3.pt
2. disease_mobilenetv3.pt

For deployment, use both MobileNetV3 model files:

- `backend/app/models/plant_mobilenetv3.pt`
- `backend/app/models/disease_mobilenetv3.pt`

Two-step inference flow:

1. Plant model predicts plant label.
2. Disease model predicts disease label, then backend filters by allowed diseases for that plant.

This keeps runtime lightweight while preserving the plant-first + disease-consistency logic in API.
