# Retraining exports and migration

This folder contains tools to export labeled user feedback for retraining.

Files:
- `export_feedbacks_for_retraining.py` — Export feedback rows to CSV manifest (requires service role key).

Quick steps:

1. Run the exporter locally (requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars):

   PowerShell example:

   ```powershell
   $env:SUPABASE_URL = 'https://<your-project>.supabase.co'
   $env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-key>'
   python .\export_feedbacks_for_retraining.py
   ```

2. CSV manifests will be written to `retraining_exports/` in this folder.

Notes:
- The exporter uses the Supabase REST API and requires a service-role key. Keep that key secret.
- Scheduled backend exports are disabled by default; set `FEEDBACK_AGGREGATOR_ENABLED=1` only when you intentionally want hourly retraining CSV snapshots.
- The exporter falls back to `diagnoses` to populate the retraining snapshot fields, so it works even if `feedbacks` does not yet have those extra columns.
# Training Scripts

This folder contains baseline scripts for training two MobileNetV3 models:

1. Plant type classifier
2. Disease classifier

Scripts:

1. `train_plant_mobilenetv3.py`
2. `train_disease_mobilenetv3.py`
3. `export_in_scope_from_manifest.py`

Progress visibility:

1. Real-time step logs per epoch in terminal
2. Train loss/accuracy summary each epoch
3. Optional validation loss/accuracy each epoch (`--val-dir`)
4. Best checkpoint auto-save

Run one model per terminal:

1. `run_train_plant.ps1`
2. `run_train_disease.ps1`

Open both terminals automatically:

1. `run_train_two_terminals.ps1`

Export in-scope data from datalake manifests:

1. `run_export_in_scope.ps1`

Example:

```powershell
./run_export_in_scope.ps1 -Target disease -CleanOutput -MinDiseaseConfidence 0.7 -MaxSamples 5000
```

Duplicate rule (default):

1. Exporter deduplicates by image content hash (SHA-256).
2. If `-CleanOutput` is not used, existing exported hashes are also respected.

Disable dedupe example:

```powershell
./run_export_in_scope.ps1 -Target disease -DedupeMode off
```

Date range example:

```powershell
./run_export_in_scope.ps1 -Target plant -SinceDate 20260401 -UntilDate 20260430 -Endpoints "/api/step1/plant"
```

Direct Python example:

```powershell
python export_in_scope_from_manifest.py --archive-root ../backend/app/upload_archive --output-root ./exports/in_scope_disease --target disease --copy-mode hardlink --dedupe-mode content-hash --clean-output --min-disease-confidence 0.7
```

Deployment uses two MobileNetV3 model files in:

- `../backend/app/models/plant_mobilenetv3.pt`
- `../backend/app/models/disease_mobilenetv3.pt`

You can keep experimenting with the two training scripts while updating both deploy models for API inference.
