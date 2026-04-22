# Model Folder

Place both deployed model files here:

- `plant_mobilenetv3.pt`
- `disease_mobilenetv3.pt`

Expected behavior:

1. Plant model outputs logits over `plant_labels.json`
2. Disease model outputs logits over flattened labels in `disease_labels_flat.json`

The API enforces consistency:

- Predicted disease must belong to the predicted plant type.
