import json
import logging
import re
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch
from torch import nn
from torchvision import models


LOGGER = logging.getLogger(__name__)


IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class PlantDiseasePredictor:
    def __init__(
        self,
        plant_model_path: Path,
        disease_model_path: Path,
        plant_backbone: str,
        disease_backbone: str,
        plant_labels_path: Path,
        disease_labels_path: Path,
        disease_map_path: Path,
        device: str = "auto",
        plant_threshold: float = 0.70,
        plant_gate_confidence: float = 0.90,
        plant_gate_margin: float = 0.12,
        disease_threshold: float = 0.60,
    ):
        self.plant_model_path = plant_model_path
        self.disease_model_path = disease_model_path

        self.plant_backbone = self._resolve_backbone(plant_backbone)
        self.disease_backbone = self._resolve_backbone(disease_backbone)
        self.plant_image_size = self._backbone_image_size(self.plant_backbone)
        self.disease_image_size = self._backbone_image_size(self.disease_backbone)

        self.plant_labels = self._load_json_list(plant_labels_path, default=[])
        self.disease_labels = self._load_json_list(disease_labels_path, default=[])

        self.plant_norm_to_label = {self._normalize(label): label for label in self.plant_labels}

        raw_disease_map = self._load_json_dict(disease_map_path, default={})
        self.allowed_diseases = self._build_allowed_diseases(raw_disease_map)
        self.disease_to_idx = {label: idx for idx, label in enumerate(self.disease_labels)}

        self.plant_threshold = plant_threshold
        self.plant_gate_confidence = max(0.0, min(1.0, plant_gate_confidence))
        self.plant_gate_margin = max(0.0, min(1.0, plant_gate_margin))
        self.disease_threshold = disease_threshold

        self.device = self._resolve_device(device)
        self.plant_model = self._load_classifier_model(
            model_path=self.plant_model_path,
            num_classes=len(self.plant_labels),
            backbone=self.plant_backbone,
            model_name="plant",
        )
        self.disease_model = self._load_classifier_model(
            model_path=self.disease_model_path,
            num_classes=len(self.disease_labels),
            backbone=self.disease_backbone,
            model_name="disease",
        )

        self.model_loaded = self.plant_model is not None and self.disease_model is not None

    def _resolve_device(self, requested: str) -> str:
        if requested == "cpu":
            return "cpu"
        if requested == "cuda":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return "cuda" if torch.cuda.is_available() else "cpu"

    def _resolve_backbone(self, requested: str) -> str:
        value = str(requested or "").strip().lower()
        if value in {"small", "mobilenet_v3_small"}:
            return "small"
        if value in {"large", "mobilenet_v3_large"}:
            return "large"
        if value in {"efficientnet_b4", "b4"}:
            return "efficientnet_b4"
        LOGGER.warning("Unsupported backbone %r; falling back to efficientnet_b4", requested)
        return "efficientnet_b4"

    def _backbone_image_size(self, backbone: str) -> int:
        return 380 if backbone == "efficientnet_b4" else 224

    def _build_classifier(self, backbone: str, num_classes: int):
        if backbone == "small":
            model = models.mobilenet_v3_small(weights=None)
        elif backbone == "large":
            model = models.mobilenet_v3_large(weights=None)
        elif backbone == "efficientnet_b4":
            model = models.efficientnet_b4(weights=None)
            in_features = model.classifier[-1].in_features
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.4),
                nn.Linear(in_features, 512),
                nn.SiLU(),
                nn.Dropout(p=0.3),
                nn.Linear(512, num_classes),
            )
            return model
        else:
            raise ValueError(f"Unsupported backbone: {backbone}")

        in_features = model.classifier[-1].in_features
        model.classifier[-1] = nn.Linear(in_features, num_classes)
        return model

    def _extract_state_dict(self, loaded_obj):
        if isinstance(loaded_obj, dict):
            if "state_dict" in loaded_obj and isinstance(loaded_obj["state_dict"], dict):
                return loaded_obj["state_dict"]

            for key in ["model_state_dict", "model", "net"]:
                value = loaded_obj.get(key)
                if isinstance(value, dict):
                    return value

            if all(isinstance(k, str) for k in loaded_obj.keys()):
                return loaded_obj

        return None

    def _load_classifier_model(self, model_path: Path, num_classes: int, backbone: str, model_name: str):
        if num_classes <= 0:
            LOGGER.warning("No labels found for %s model. Skipping model load.", model_name)
            return None

        if not model_path.exists():
            LOGGER.warning("%s model file not found at %s", model_name.capitalize(), model_path)
            return None

        # Prefer loading checkpoints/state-dicts first (more common for this project).
        # Windows/PyTorch can fail to fopen paths containing Vietnamese characters;
        # opening the file in Python keeps Unicode path handling on Python's side.
        try:
            with model_path.open("rb") as model_file:
                loaded_obj = torch.load(model_file, map_location=self.device)

            if isinstance(loaded_obj, nn.Module):
                loaded_obj.to(self.device)
                loaded_obj.eval()
                LOGGER.info("Loaded nn.Module %s model from %s", model_name, model_path)
                return loaded_obj

            state_dict = self._extract_state_dict(loaded_obj)
            if state_dict is not None:
                model = self._build_classifier(backbone=backbone, num_classes=num_classes)
                missing_keys, unexpected_keys = model.load_state_dict(state_dict, strict=False)
                if missing_keys:
                    LOGGER.warning("%s model missing keys: %s", model_name, missing_keys[:10])
                if unexpected_keys:
                    LOGGER.warning("%s model unexpected keys: %s", model_name, unexpected_keys[:10])

                model.to(self.device)
                model.eval()
                LOGGER.info("Loaded %s model checkpoint from %s", model_name, model_path)
                return model
        except Exception as exc:
            # Keep this as info/debug rather than a loud error — may be a TorchScript archive.
            LOGGER.debug("torch.load did not return state_dict/Module for %s: %s", model_name, exc)

        # As a fallback, try loading a TorchScript archive (may emit missing constants warnings).
        try:
            with model_path.open("rb") as model_file:
                model = torch.jit.load(model_file, map_location=self.device)
            model.eval()
            LOGGER.info("Loaded TorchScript %s model from %s", model_name, model_path)
            return model
        except Exception as exc:
            LOGGER.warning("Could not load TorchScript %s model (fallback): %s", model_name, exc)

        LOGGER.error("Unsupported or unreadable model format for %s at %s", model_name, model_path)
        return None

    def _load_json_list(self, path: Path, default: list[str]) -> list[str]:
        if not path.exists():
            return default
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list) and all(isinstance(x, str) for x in data):
                return data
        except Exception:
            pass
        return default

    def _load_json_dict(self, path: Path, default: dict[str, list[str]]) -> dict[str, list[str]]:
        if not path.exists():
            return default
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                out: dict[str, list[str]] = {}
                for key, value in data.items():
                    if isinstance(value, list):
                        out[str(key)] = [str(v) for v in value]
                if out:
                    return out
        except Exception:
            pass
        return default

    def _normalize(self, text: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", text.lower())

    def _build_allowed_from_flat(self) -> dict[str, list[str]]:
        out: dict[str, list[str]] = {}
        for label in self.disease_labels:
            plant = label.split("___", 1)[0] if "___" in label else label
            out.setdefault(plant, []).append(label)
        return out

    def _build_allowed_from_map(self, raw_map: dict[str, list[str]]) -> dict[str, list[str]]:
        if not raw_map:
            return {}

        disease_label_set = set(self.disease_labels)
        disease_norm_to_label = {self._normalize(label): label for label in self.disease_labels}

        mapped: dict[str, list[str]] = {}
        for raw_plant, raw_labels in raw_map.items():
            plant_label = self.resolve_plant_label(raw_plant)
            if plant_label is None:
                continue

            valid_labels: list[str] = []
            for raw_label in raw_labels:
                if raw_label in disease_label_set:
                    valid_labels.append(raw_label)
                    continue

                mapped_label = disease_norm_to_label.get(self._normalize(raw_label))
                if mapped_label is not None:
                    valid_labels.append(mapped_label)

            if valid_labels:
                mapped[plant_label] = sorted(set(valid_labels))

        return mapped

    def _build_allowed_diseases(self, raw_map: dict[str, list[str]]) -> dict[str, list[str]]:
        from_flat = self._build_allowed_from_flat()
        from_map = self._build_allowed_from_map(raw_map)

        merged = dict(from_flat)
        for plant, labels in from_map.items():
            if plant not in merged:
                merged[plant] = labels
            else:
                extra = [label for label in labels if label not in merged[plant]]
                merged[plant].extend(extra)

        return merged

    def _prepare_tensor(self, image: np.ndarray, image_size: int) -> torch.Tensor:
        height, width = image.shape[:2]
        size = int(image_size)
        if width > size or height > size:
            interp = cv2.INTER_AREA
        else:
            interp = cv2.INTER_LINEAR
        resized = cv2.resize(image, (size, size), interpolation=interp)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        arr = rgb.astype(np.float32) / 255.0
        arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
        tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)
        return tensor.to(self.device)

    def _softmax_numpy(self, logits: np.ndarray) -> np.ndarray:
        if logits.size == 0:
            return logits
        shifted = logits - np.max(logits)
        exp = np.exp(shifted)
        denom = np.sum(exp)
        if denom <= 0:
            return np.full_like(exp, 1.0 / len(exp), dtype=np.float32)
        return exp / denom

    def _extract_logits(self, output) -> torch.Tensor:
        if isinstance(output, torch.Tensor):
            return output

        if isinstance(output, dict):
            for key in ["logits", "output", "pred"]:
                if key in output and isinstance(output[key], torch.Tensor):
                    return output[key]

        if isinstance(output, (tuple, list)) and output:
            first = output[0]
            if isinstance(first, torch.Tensor):
                return first

        raise ValueError("Model output must contain logits tensor")

    def resolve_plant_label(self, plant_label: str) -> str | None:
        if plant_label in self.plant_labels:
            return plant_label

        norm = self._normalize(plant_label)
        return self.plant_norm_to_label.get(norm)

    def _missing_step1(self) -> dict:
        return {
            "step1_done": False,
            "plant_label": "unknown_plant",
            "plant_confidence": 0.0,
            "top1_top2_margin": 0.0,
            "requires_confirmation": True,
            "auto_confirmed": False,
            "top_candidates": [],
            "model_loaded": self.model_loaded,
            "inference_mode": "two_step",
        }

    def _missing_step2(self, plant_label: str) -> dict:
        return {
            "step2_done": False,
            "plant_label": plant_label,
            "disease_label": f"{plant_label}___unknown_disease",
            "disease_confidence": 0.0,
            "step2_allowed_classes": 0,
            "inconsistent": False,
            "model_loaded": self.model_loaded,
            "inference_mode": "two_step",
        }

    def _build_label_candidates(
        self,
        probs: np.ndarray,
        labels: list[str],
        top_k: int = 3,
    ) -> list[dict[str, float | int | str]]:
        if probs.size == 0:
            return []

        top_indices = np.argsort(-probs)[:top_k]
        candidates: list[dict[str, float | int | str]] = []
        for rank, idx in enumerate(top_indices, start=1):
            if idx >= len(labels):
                continue
            candidates.append(
                {
                    "label": labels[int(idx)],
                    "confidence": round(float(probs[int(idx)]), 4),
                    "rank": rank,
                }
            )
        return candidates

    def _build_top_candidates(self, probs: np.ndarray, top_k: int = 3) -> list[dict[str, float | int | str]]:
        return self._build_label_candidates(probs=probs, labels=self.plant_labels, top_k=top_k)

    def inspect_plant(self, image: np.ndarray, top_k: int = 3) -> dict[str, Any]:
        """Run the plant model and return raw top-1 label/confidence.

        Unlike `predict_plant`, this method does NOT apply `plant_threshold` to mask the
        label into `unknown_plant`. This is useful for Step2 verification to avoid false
        rejects on hard/blurred/diseased images.
        """

        if self.plant_model is None:
            return {
                "can_run": False,
                "top1_label": "unknown_plant",
                "top1_confidence": 0.0,
                "top1_top2_margin": 0.0,
                "top_candidates": [],
            }

        tensor = self._prepare_tensor(image, image_size=self.plant_image_size)

        with torch.no_grad():
            plant_out = self.plant_model(tensor)

        plant_logits = self._extract_logits(plant_out)
        plant_logits_np = plant_logits.detach().cpu().numpy()
        if plant_logits_np.ndim == 2:
            plant_logits_np = plant_logits_np[0]
        elif plant_logits_np.ndim != 1:
            raise ValueError("Plant logits must be 1D or 2D tensor")

        plant_probs = self._softmax_numpy(plant_logits_np.astype(np.float32))
        if plant_probs.size == 0:
            return {
                "can_run": True,
                "top1_label": "unknown_plant",
                "top1_confidence": 0.0,
                "top1_top2_margin": 0.0,
                "top_candidates": [],
            }

        top_indices = np.argsort(-plant_probs)
        top1_idx = int(top_indices[0])
        top1_conf = float(plant_probs[top1_idx])
        top2_conf = float(plant_probs[int(top_indices[1])]) if len(top_indices) > 1 else 0.0
        top1_top2_margin = max(0.0, top1_conf - top2_conf)

        if 0 <= top1_idx < len(self.plant_labels):
            top1_label = self.plant_labels[top1_idx]
        else:
            top1_label = "unknown_plant"

        top_candidates = self._build_top_candidates(plant_probs, top_k=int(top_k))

        return {
            "can_run": True,
            "top1_label": top1_label,
            "top1_confidence": float(top1_conf),
            "top1_top2_margin": float(top1_top2_margin),
            "top_candidates": top_candidates,
        }

    def predict_plant(self, image: np.ndarray) -> dict:
        if self.plant_model is None:
            return self._missing_step1()

        inspected = self.inspect_plant(image=image, top_k=3)
        top_candidates = inspected.get("top_candidates", [])
        top1_label = str(inspected.get("top1_label", "unknown_plant"))
        top1_conf = float(inspected.get("top1_confidence", 0.0))
        top1_top2_margin = float(inspected.get("top1_top2_margin", 0.0))

        low_confidence = top1_conf < self.plant_gate_confidence
        close_margin = top1_top2_margin < self.plant_gate_margin
        requires_confirmation = low_confidence or close_margin

        plant_label = top1_label
        if top1_conf < self.plant_threshold:
            plant_label = "unknown_plant"
            requires_confirmation = True

        auto_confirmed = plant_label != "unknown_plant" and not requires_confirmation

        return {
            "step1_done": True,
            "plant_label": plant_label,
            "plant_confidence": round(top1_conf, 4),
            "top1_top2_margin": round(float(top1_top2_margin), 4),
            "requires_confirmation": requires_confirmation,
            "auto_confirmed": auto_confirmed,
            "top_candidates": top_candidates,
            "model_loaded": self.model_loaded,
            "inference_mode": "two_step",
        }

    def validate_step2_plant_match(self, image: np.ndarray, confirmed_plant_label: str) -> dict[str, float | str | bool]:
        resolved_confirmed = self.resolve_plant_label(confirmed_plant_label)
        if resolved_confirmed is None:
            return {
                "can_verify": False,
                "confirmed_plant_label": "unknown_plant",
                "detected_plant_label": "unknown_plant",
                "detected_plant_confidence": 0.0,
                "detected_top1_top2_margin": 0.0,
                "requires_confirmation": True,
                "confident_detection": False,
                "mismatch": False,
            }

        if self.plant_model is None:
            return {
                "can_verify": False,
                "confirmed_plant_label": resolved_confirmed,
                "detected_plant_label": "unknown_plant",
                "detected_plant_confidence": 0.0,
                "detected_top1_top2_margin": 0.0,
                "requires_confirmation": True,
                "confident_detection": False,
                "mismatch": False,
            }

        inspected = self.inspect_plant(image=image, top_k=3)
        detected_plant = str(inspected.get("top1_label", "unknown_plant"))
        detected_conf = float(inspected.get("top1_confidence", 0.0))
        detected_margin = float(inspected.get("top1_top2_margin", 0.0))

        low_confidence = detected_conf < self.plant_gate_confidence
        close_margin = detected_margin < self.plant_gate_margin
        requires_confirmation = low_confidence or close_margin

        confident_detection = detected_plant != "unknown_plant" and not requires_confirmation
        mismatch = confident_detection and detected_plant != resolved_confirmed

        return {
            "can_verify": True,
            "confirmed_plant_label": resolved_confirmed,
            "detected_plant_label": detected_plant,
            "detected_plant_confidence": round(detected_conf, 4),
            "detected_top1_top2_margin": round(detected_margin, 4),
            "requires_confirmation": requires_confirmation,
            "confident_detection": confident_detection,
            "mismatch": mismatch,
        }

    def predict_disease_for_plant(self, image: np.ndarray, plant_label: str) -> dict:
        if self.disease_model is None:
            return self._missing_step2(plant_label=plant_label)

        resolved_plant = self.resolve_plant_label(plant_label)
        if resolved_plant is None:
            return self._missing_step2(plant_label="unknown_plant")

        allowed_labels = [
            label
            for label in self.allowed_diseases.get(resolved_plant, [])
            if label in self.disease_to_idx
        ]

        if not allowed_labels:
            return {
                "step2_done": False,
                "plant_label": resolved_plant,
                "disease_label": f"{resolved_plant}___unknown_disease",
                "disease_confidence": 0.0,
                "step2_allowed_classes": 0,
                "inconsistent": True,
                "model_loaded": self.model_loaded,
                "inference_mode": "two_step",
            }

        tensor = self._prepare_tensor(image, image_size=self.disease_image_size)

        # Step 2 runs only after caller has already determined plant label.
        with torch.no_grad():
            disease_out = self.disease_model(tensor)

        disease_logits = self._extract_logits(disease_out)
        disease_logits_np = disease_logits.detach().cpu().numpy()
        if disease_logits_np.ndim == 2:
            disease_logits_np = disease_logits_np[0]
        elif disease_logits_np.ndim != 1:
            raise ValueError("Disease logits must be 1D or 2D tensor")

        raw_disease_idx = int(np.argmax(disease_logits_np))
        if raw_disease_idx < len(self.disease_labels):
            raw_disease = self.disease_labels[raw_disease_idx]
        else:
            raw_disease = f"{resolved_plant}___unknown_disease"

        allowed_indices = [self.disease_to_idx[label] for label in allowed_labels]
        allowed_logits = disease_logits_np[allowed_indices]
        allowed_probs = self._softmax_numpy(allowed_logits.astype(np.float32))
        disease_top_candidates = self._build_label_candidates(
            probs=allowed_probs,
            labels=allowed_labels,
            top_k=3,
        )

        local_best_idx = int(np.argmax(allowed_probs))
        global_best_idx = allowed_indices[local_best_idx]

        disease_label = self.disease_labels[global_best_idx]
        disease_conf = float(allowed_probs[local_best_idx])
        inconsistent = raw_disease not in set(allowed_labels)

        if disease_conf < self.disease_threshold:
            disease_label = f"{resolved_plant}___unknown_disease"

        return {
            "step2_done": True,
            "plant_label": resolved_plant,
            "disease_label": disease_label,
            "disease_confidence": round(disease_conf, 4),
            "disease_top_candidates": disease_top_candidates,
            "step2_allowed_classes": len(allowed_labels),
            "inconsistent": inconsistent,
            "model_loaded": self.model_loaded,
            "inference_mode": "two_step",
        }

    def predict(self, image: np.ndarray) -> dict:
        step1 = self.predict_plant(image)
        plant_label = step1["plant_label"]

        if plant_label == "unknown_plant":
            out = dict(step1)
            out.update(
                {
                    "step2_done": False,
                    "disease_label": "unknown_plant___unknown_disease",
                    "disease_confidence": 0.0,
                    "step2_allowed_classes": 0,
                    "inconsistent": False,
                }
            )
            return out

        step2 = self.predict_disease_for_plant(image=image, plant_label=plant_label)

        return {
            "step1_done": step1.get("step1_done", False),
            "step2_done": step2.get("step2_done", False),
            "plant_label": step1.get("plant_label", "unknown_plant"),
            "plant_confidence": step1.get("plant_confidence", 0.0),
            "disease_label": step2.get("disease_label", f"{plant_label}___unknown_disease"),
            "disease_confidence": step2.get("disease_confidence", 0.0),
            "disease_top_candidates": step2.get("disease_top_candidates", []),
            "step2_allowed_classes": step2.get("step2_allowed_classes", 0),
            "inconsistent": step2.get("inconsistent", False),
            "model_loaded": self.model_loaded,
            "inference_mode": "two_step",
        }
