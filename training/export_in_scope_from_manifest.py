from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter
from pathlib import Path
from typing import Any


def get_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export in-scope samples from datalake manifests into class-folder dataset"
    )
    parser.add_argument(
        "--archive-root",
        type=Path,
        default=Path("../backend/app/upload_archive"),
        help="Path to upload_archive root",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        required=True,
        help="Export directory (ImageFolder style: <output>/<class>/<image>)",
    )
    parser.add_argument(
        "--target",
        choices=["plant", "disease"],
        default="disease",
        help="Label target to export",
    )
    parser.add_argument(
        "--endpoints",
        type=str,
        default="",
        help="Comma-separated endpoint allow-list. Empty = default by target",
    )
    parser.add_argument(
        "--copy-mode",
        choices=["hardlink", "copy"],
        default="hardlink",
        help="Use hardlink to save disk; fallback to copy if hardlink fails",
    )
    parser.add_argument(
        "--dedupe-mode",
        choices=["content-hash", "off"],
        default="content-hash",
        help="Duplicate handling mode. content-hash keeps first unique image bytes",
    )
    parser.add_argument(
        "--min-plant-confidence",
        type=float,
        default=0.0,
        help="Minimum plant confidence when target=plant",
    )
    parser.add_argument(
        "--min-disease-confidence",
        type=float,
        default=0.0,
        help="Minimum disease confidence when target=disease",
    )
    parser.add_argument(
        "--since-date",
        type=str,
        default="",
        help="Lower bound date in YYYYMMDD based on captured_at_utc",
    )
    parser.add_argument(
        "--until-date",
        type=str,
        default="",
        help="Upper bound date in YYYYMMDD based on captured_at_utc",
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=0,
        help="Maximum exported samples (0 means no limit)",
    )
    parser.add_argument(
        "--clean-output",
        action="store_true",
        help="Delete output-root before export",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan and count only, do not write files",
    )
    return parser.parse_args()


def _validate_yyyymmdd(value: str, flag_name: str) -> str:
    raw = value.strip()
    if not raw:
        return ""
    if len(raw) != 8 or not raw.isdigit():
        raise ValueError(f"{flag_name} must be YYYYMMDD")
    return raw


def _default_endpoints(target: str) -> set[str]:
    if target == "plant":
        return {"/api/step1/plant"}
    return {"/api/step2/disease"}


def _parse_endpoints(value: str, target: str) -> set[str]:
    raw = value.strip()
    if not raw:
        return _default_endpoints(target)
    return {item.strip() for item in raw.split(",") if item.strip()}


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _extract_ymd(record: dict[str, Any]) -> str:
    captured = str(record.get("captured_at_utc", "")).strip()
    if len(captured) >= 10:
        return captured[:10].replace("-", "")
    return ""


def _resolve_source_image(record: dict[str, Any]) -> Path | None:
    candidates: list[Path] = []
    for key in ["scoped_image_path", "raw_image_path"]:
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            candidates.append(Path(value))

    for path in candidates:
        if path.exists() and path.is_file():
            return path
    return None


def _build_output_name(record: dict[str, Any], sample_idx: int, src_name: str) -> str:
    stamp = str(record.get("captured_at_utc", "")).strip()
    stamp = stamp.replace(":", "").replace("-", "").replace("T", "_").replace("Z", "")
    if not stamp:
        stamp = f"sample_{sample_idx:08d}"
    return f"{stamp}_{sample_idx:08d}_{src_name}"


def _link_or_copy(src: Path, dst: Path, copy_mode: str) -> str:
    dst.parent.mkdir(parents=True, exist_ok=True)

    if copy_mode == "hardlink":
        try:
            if dst.exists():
                dst.unlink()
            dst.hardlink_to(src)
            return "hardlink"
        except OSError:
            pass

    shutil.copy2(src, dst)
    return "copy"


def _compute_file_sha256(path: Path) -> str | None:
    sha = hashlib.sha256()
    try:
        with path.open("rb") as f:
            while True:
                chunk = f.read(1024 * 1024)
                if not chunk:
                    break
                sha.update(chunk)
        return sha.hexdigest()
    except Exception:
        return None


def _load_existing_export_hashes(export_manifest_path: Path) -> set[str]:
    hashes: set[str] = set()
    if not export_manifest_path.exists():
        return hashes

    try:
        with export_manifest_path.open("r", encoding="utf-8") as f:
            for line in f:
                raw = line.strip()
                if not raw:
                    continue
                try:
                    record = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if not isinstance(record, dict):
                    continue
                digest = record.get("content_sha256")
                if isinstance(digest, str) and digest:
                    hashes.add(digest)
    except Exception:
        return hashes

    return hashes


def _extract_label_and_confidence(
    record: dict[str, Any],
    target: str,
    min_plant_confidence: float,
    min_disease_confidence: float,
) -> tuple[str | None, float, str | None]:
    prediction = record.get("prediction")
    if not isinstance(prediction, dict):
        return None, 0.0, "missing_prediction"

    if target == "plant":
        label = str(prediction.get("plant_label", "unknown_plant"))
        confidence = _to_float(prediction.get("plant_confidence"), default=0.0)

        if label == "unknown_plant":
            return None, confidence, "unknown_plant_label"
        if confidence < min_plant_confidence:
            return None, confidence, "below_min_plant_confidence"
        return label, confidence, None

    label = str(prediction.get("disease_label", ""))
    confidence = _to_float(prediction.get("disease_confidence"), default=0.0)

    if not label:
        return None, confidence, "missing_disease_label"
    if label.endswith("unknown_disease"):
        return None, confidence, "unknown_disease_label"
    if "___" not in label:
        return None, confidence, "invalid_disease_label"
    if confidence < min_disease_confidence:
        return None, confidence, "below_min_disease_confidence"
    return label, confidence, None


def main() -> None:
    args = get_args()

    args.since_date = _validate_yyyymmdd(args.since_date, "--since-date")
    args.until_date = _validate_yyyymmdd(args.until_date, "--until-date")

    if args.since_date and args.until_date and args.since_date > args.until_date:
        raise ValueError("--since-date must be <= --until-date")

    archive_root = args.archive_root.resolve()
    manifests_root = archive_root / "manifests"
    if not manifests_root.exists():
        print(f"Manifest root not found: {manifests_root}")
        print("No data exported. Run API inference first to generate datalake manifests.")
        return

    manifest_files = sorted(manifests_root.glob("*/records.jsonl"))
    if not manifest_files:
        print(f"No manifest files found under {manifests_root}")
        return

    output_root = args.output_root.resolve()
    metadata_root = output_root / "_metadata"
    export_manifest_path = output_root / "_export_manifest.jsonl"
    summary_path = output_root / "_summary.json"

    if args.clean_output and output_root.exists() and not args.dry_run:
        shutil.rmtree(output_root)

    if not args.dry_run:
        output_root.mkdir(parents=True, exist_ok=True)
        metadata_root.mkdir(parents=True, exist_ok=True)
        if export_manifest_path.exists():
            export_manifest_path.unlink()

    endpoint_allow_list = _parse_endpoints(args.endpoints, args.target)

    seen = 0
    exported = 0
    hardlinked = 0
    copied = 0

    hash_cache: dict[str, str] = {}
    seen_hashes: set[str] = set()
    if args.dedupe_mode == "content-hash" and not args.clean_output:
        seen_hashes = _load_existing_export_hashes(export_manifest_path)

    class_counter: Counter[str] = Counter()
    skip_counter: Counter[str] = Counter()

    manifest_writer = None
    stop = False
    try:
        if not args.dry_run:
            manifest_writer = export_manifest_path.open("a", encoding="utf-8")

        for manifest_path in manifest_files:
            with manifest_path.open("r", encoding="utf-8") as f:
                for line_no, line in enumerate(f, start=1):
                    raw_line = line.strip()
                    if not raw_line:
                        continue

                    seen += 1

                    try:
                        record = json.loads(raw_line)
                    except json.JSONDecodeError:
                        skip_counter["invalid_json"] += 1
                        continue

                    if not isinstance(record, dict):
                        skip_counter["invalid_record"] += 1
                        continue

                    if str(record.get("scope_bucket", "")) != "in_scope":
                        skip_counter["not_in_scope"] += 1
                        continue

                    endpoint = str(record.get("endpoint", ""))
                    if endpoint_allow_list and endpoint not in endpoint_allow_list:
                        skip_counter["endpoint_filtered"] += 1
                        continue

                    captured_ymd = _extract_ymd(record)
                    if args.since_date and captured_ymd and captured_ymd < args.since_date:
                        skip_counter["before_since_date"] += 1
                        continue
                    if args.until_date and captured_ymd and captured_ymd > args.until_date:
                        skip_counter["after_until_date"] += 1
                        continue
                    if (args.since_date or args.until_date) and not captured_ymd:
                        skip_counter["missing_capture_date"] += 1
                        continue

                    label, confidence, label_reason = _extract_label_and_confidence(
                        record=record,
                        target=args.target,
                        min_plant_confidence=args.min_plant_confidence,
                        min_disease_confidence=args.min_disease_confidence,
                    )
                    if label is None:
                        skip_counter[label_reason or "label_filtered"] += 1
                        continue

                    src_image = _resolve_source_image(record)
                    if src_image is None:
                        skip_counter["missing_source_image"] += 1
                        continue

                    content_sha256 = ""
                    if args.dedupe_mode == "content-hash":
                        src_key = str(src_image)
                        if src_key in hash_cache:
                            content_sha256 = hash_cache[src_key]
                        else:
                            digest = _compute_file_sha256(src_image)
                            if digest is None:
                                skip_counter["hash_read_error"] += 1
                                continue
                            hash_cache[src_key] = digest
                            content_sha256 = digest

                        if content_sha256 in seen_hashes:
                            skip_counter["duplicate_content_hash"] += 1
                            continue

                        seen_hashes.add(content_sha256)

                    exported += 1
                    class_counter[label] += 1

                    out_name = _build_output_name(record, exported, src_image.name)
                    dst_image = output_root / label / out_name

                    export_record = {
                        "label": label,
                        "confidence": round(confidence, 4),
                        "content_sha256": content_sha256 if content_sha256 else None,
                        "source_endpoint": endpoint,
                        "source_scope_bucket": "in_scope",
                        "source_image_path": str(src_image),
                        "export_image_path": str(dst_image),
                        "captured_at_utc": record.get("captured_at_utc"),
                        "manifest_file": str(manifest_path),
                        "manifest_line": line_no,
                    }

                    if not args.dry_run:
                        method = _link_or_copy(src_image, dst_image, args.copy_mode)
                        if method == "hardlink":
                            hardlinked += 1
                        else:
                            copied += 1

                        metadata_path = metadata_root / f"{dst_image.stem}.json"
                        metadata_payload = {
                            "export": export_record,
                            "source_record": record,
                        }
                        metadata_path.write_text(
                            json.dumps(metadata_payload, ensure_ascii=True, indent=2),
                            encoding="utf-8",
                        )

                        export_record["metadata_path"] = str(metadata_path)
                        manifest_writer.write(json.dumps(export_record, ensure_ascii=True) + "\n")

                    if args.max_samples > 0 and exported >= args.max_samples:
                        stop = True
                        break

            if stop:
                break
    finally:
        if manifest_writer is not None:
            manifest_writer.close()

    summary = {
        "archive_root": str(archive_root),
        "output_root": str(output_root),
        "target": args.target,
        "seen_records": seen,
        "exported_records": exported,
        "hardlinked": hardlinked,
        "copied": copied,
        "skipped_by_reason": dict(skip_counter),
        "exported_by_class": dict(class_counter),
        "endpoint_allow_list": sorted(endpoint_allow_list),
        "copy_mode": args.copy_mode,
        "dedupe_mode": args.dedupe_mode,
        "unique_content_hashes": len(seen_hashes),
        "dry_run": args.dry_run,
    }

    if not args.dry_run:
        summary_path.write_text(json.dumps(summary, ensure_ascii=True, indent=2), encoding="utf-8")

    print("=" * 80)
    print("[Export In-Scope From Manifest]")
    print(f"archive_root={archive_root}")
    print(f"output_root={output_root}")
    print(f"target={args.target}")
    print(f"seen_records={seen}")
    print(f"exported_records={exported}")
    print(f"hardlinked={hardlinked} copied={copied}")
    print(f"classes={len(class_counter)}")
    if skip_counter:
        print("skipped_by_reason=")
        for key, count in sorted(skip_counter.items()):
            print(f"  - {key}: {count}")
    print("=" * 80)


if __name__ == "__main__":
    main()
