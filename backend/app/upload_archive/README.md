# Upload Archive / Datalake

This folder stores user uploads and prediction metadata for future dataset improvement.

Structure:

- raw/<flow>/YYYYMMDD/<timestamp_uuid_filename>
- raw/<flow>/YYYYMMDD/<timestamp_uuid_filename>.json
- scoped/in_scope/YYYYMMDD/<timestamp_uuid_filename>
- scoped/out_of_scope/YYYYMMDD/<timestamp_uuid_filename>
- scoped/other/YYYYMMDD/<timestamp_uuid_filename>
- manifests/YYYYMMDD/records.jsonl

Scope rule:

- in_scope: predicted plant label belongs to current supported plant labels.
- out_of_scope: predicted plant label is unknown_plant and leaf_detected=true.
- other: all remaining cases.

Sidecar JSON includes:

- captured_at_utc
- endpoint
- flow
- scope_bucket
- raw_image_path
- scoped_image_path
- prediction
- extra

Notes:

- This directory is intentionally git-ignored (except this README and .gitignore).
- Configure behavior with env vars:
  - UPLOAD_ARCHIVE_ENABLED (default: 1)
  - UPLOAD_ARCHIVE_DIR (default: backend/app/upload_archive)
  - UPLOAD_MAX_IMAGE_BYTES (default: 8388608)
  - STEP2_MAX_FILES (default: 6)
  - STEP2_MAX_TOTAL_BYTES (default: 25165824)
