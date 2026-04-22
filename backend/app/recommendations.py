import json
from pathlib import Path


class RecommendationEngine:
    def __init__(self, recommendations_path: Path):
        self.recommendations_path = recommendations_path
        self._mapping = self._load_mapping()

    def _load_mapping(self) -> dict[str, str]:
        if not self.recommendations_path.exists():
            return {}

        with self.recommendations_path.open("r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict):
            return {}
        return {str(k): str(v) for k, v in data.items()}

    def get(self, disease_label: str, plant_label: str) -> str:
        if disease_label in self._mapping:
            return self._mapping[disease_label]

        if "healthy" in disease_label:
            return "La cay co dau hieu khoe manh. Duy tri tuoi vua du, thoang gio, va theo doi dinh ky moi 2-3 ngay."

        if disease_label.endswith("unknown_disease"):
            return (
                f"Chua xac dinh ro benh tren {plant_label}. Ban nen chup anh ro hon (anh sang tot, khong rung) "
                "va theo doi them trieu chung trong 24-48 gio."
            )

        return "Khuyen nghi chung: cat bo la benh nang, giu tan la kho, tranh tuoi len la vao chieu toi, va theo doi 2-3 ngay."
