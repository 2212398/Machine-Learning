# Model Folder

Place both deployed model files here:

- `plant_efficientnet_b4.pt`
- `disease_efficientnet_b4.pt`

Expected behavior:

1. Plant model outputs logits over `plant_labels.json`
2. Disease model outputs logits over flattened labels in `disease_labels_flat.json`
3. Current default deploy backbone is EfficientNet-B4 (`*_efficientnet_b4.pt`)

The API enforces consistency:

- Predicted disease must belong to the predicted plant type.
