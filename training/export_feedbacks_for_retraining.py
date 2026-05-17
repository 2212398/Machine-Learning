"""
Export labeled feedbacks from Supabase to a CSV manifest for retraining.

Usage:
  Set environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` or provide them
  on the command line. Run:
    python export_feedbacks_for_retraining.py

Output:
    - Creates CSV files under `training/retraining_exports/` with columns:
            image_url,plant_label,disease_label,plant_confidence,disease_confidence,
            user_id,feedback_is_correct,feedback_note,feedback_created_at,diagnosis_id

Notes:
  - This script uses the Supabase REST API and requires a service role key.
"""

import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin
import urllib.parse
import urllib.request

REPO_ROOT = Path(__file__).resolve().parent
EXPORT_DIR = REPO_ROOT / "retraining_exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("ERROR: Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}

ENDPOINT = urljoin(SUPABASE_URL, "/rest/v1/feedbacks")
PARAMS = {
    "select": "id,diagnosis_id,user_id,is_correct,note,created_at",
    "order": "created_at.desc",
}

print("Querying Supabase for feedbacks...")
query = urllib.parse.urlencode(PARAMS)
request_url = f"{ENDPOINT}?{query}"
req = urllib.request.Request(request_url, headers=HEADERS)
try:
    with urllib.request.urlopen(req, timeout=30) as response:
        records = json.loads(response.read().decode("utf-8"))
except Exception as exc:
    print("Failed to query Supabase:", exc)
    sys.exit(1)

print(f"Fetched {len(records)} feedback records")

diagnosis_ids = sorted({str(r.get("diagnosis_id") or "") for r in records if r.get("diagnosis_id")})
diagnosis_map = {}

if diagnosis_ids:
    diag_params = {
        "select": "id,image_url,plant_label,disease_label,plant_confidence,disease_confidence",
        "id": f"in.({','.join(diagnosis_ids)})",
    }
    diag_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/diagnoses?{urllib.parse.urlencode(diag_params)}"
    diag_req = urllib.request.Request(diag_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(diag_req, timeout=30) as response:
            diag_records = json.loads(response.read().decode("utf-8"))
            diagnosis_map = {str(r.get("id") or ""): r for r in diag_records}
    except Exception as exc:
        print("Warning: failed to fetch diagnosis snapshot data:", exc)

timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
outfile = EXPORT_DIR / f"feedbacks_manifest_{timestamp}.csv"

with outfile.open("w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "image_url",
        "plant_label",
        "disease_label",
        "plant_confidence",
        "disease_confidence",
        "user_id",
        "feedback_is_correct",
        "feedback_note",
        "feedback_created_at",
        "diagnosis_id",
    ])
    for r in records:
        diagnosis = diagnosis_map.get(str(r.get("diagnosis_id") or ""), {})
        writer.writerow([
            diagnosis.get("image_url") or "",
            diagnosis.get("plant_label") or "",
            diagnosis.get("disease_label") or "",
            diagnosis.get("plant_confidence") or "",
            diagnosis.get("disease_confidence") or "",
            r.get("user_id") or "",
            r.get("is_correct") or False,
            (r.get("note") or "").replace("\n", " "),
            r.get("created_at") or "",
            r.get("diagnosis_id") or "",
        ])

print("Exported manifest:", outfile)
print("Done.")
