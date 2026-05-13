import json
import re
from pathlib import Path


class RecommendationEngine:
    def __init__(self, recommendations_path: Path):
        self.recommendations_path = recommendations_path
        self._mapping, self._checklists = self._load_data()

    def _to_str_list(self, value) -> list[str]:
        if value is None:
            return []

        if isinstance(value, list):
            out: list[str] = []
            for item in value:
                text = str(item).strip()
                if text:
                    out.append(text)
            return out

        if isinstance(value, str):
            text = value.strip()
            return [text] if text else []

        text = str(value).strip()
        return [text] if text else []

    def _load_data(self) -> tuple[dict[str, str], dict[str, dict[str, list[str]]]]:
        if not self.recommendations_path.exists():
            return {}, {}

        with self.recommendations_path.open("r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict):
            return {}, {}

        summaries: dict[str, str] = {}
        checklists: dict[str, dict[str, list[str]]] = {}

        for raw_key, raw_value in data.items():
            key = str(raw_key)

            if isinstance(raw_value, str):
                summaries[key] = raw_value
                continue

            if isinstance(raw_value, dict):
                summary_value = raw_value.get("summary")
                if summary_value is None:
                    summary_value = raw_value.get("text")
                if summary_value is None:
                    summary_value = raw_value.get("recommendation")

                if summary_value is None:
                    summaries[key] = ""
                else:
                    summaries[key] = str(summary_value)

                checklist_raw = raw_value.get("checklist")
                if isinstance(checklist_raw, dict):
                    immediate = self._to_str_list(checklist_raw.get("immediate"))
                    monitor = self._to_str_list(checklist_raw.get("monitor"))
                    consult = self._to_str_list(checklist_raw.get("consult"))
                else:
                    immediate = self._to_str_list(raw_value.get("immediate"))
                    monitor = self._to_str_list(raw_value.get("monitor"))
                    consult = self._to_str_list(raw_value.get("consult"))

                if immediate or monitor or consult:
                    checklists[key] = {
                        "immediate": immediate,
                        "monitor": monitor,
                        "consult": consult,
                    }

                continue

            summaries[key] = str(raw_value)

        return summaries, checklists

    def get(self, disease_label: str, plant_label: str) -> str:
        if disease_label in self._mapping:
            return self._mapping[disease_label]

        if "healthy" in disease_label:
            return "Lá cây có dấu hiệu khỏe mạnh. Duy trì tưới vừa đủ, thoáng gió, và theo dõi định kỳ mỗi 2-3 ngày."

        if disease_label.endswith("unknown_disease"):
            return (
                f"Chưa xác định rõ bệnh trên {plant_label}. Bạn nên chụp ảnh rõ hơn (ánh sáng tốt, không rung) "
                "và theo dõi thêm triệu chứng trong 24-48 giờ."
            )

        return "Khuyến nghị chung: cắt bỏ lá bệnh nặng, giữ tán lá khô, tránh tưới lên lá vào chiều tối, và theo dõi 2-3 ngày."

    def get_checklist(self, disease_label: str, plant_label: str) -> dict[str, list[str]]:
        if disease_label in self._checklists:
            checklist = self._checklists[disease_label]
            return {
                "immediate": list(checklist.get("immediate", [])),
                "monitor": list(checklist.get("monitor", [])),
                "consult": list(checklist.get("consult", [])),
            }

        summary = self.get(disease_label=disease_label, plant_label=plant_label)

        if disease_label.endswith("unknown_disease") or disease_label.startswith("unknown_plant"):
            return {
                "immediate": [
                    "Chụp lại ảnh rõ 1 lá (ánh sáng tốt, không rung, nền đơn giản)",
                    "Cách ly tạm thời cây/lá nghi bệnh để tránh lây lan",
                    "Vệ sinh dụng cụ cắt tỉa trước/sau khi thao tác",
                ],
                "monitor": [
                    "Theo dõi thêm 24-48 giờ: đốm lan nhanh/chậm, lá có vàng/héo không",
                    "Chụp lại ảnh mỗi ngày để so sánh diễn tiến",
                ],
                "consult": [
                    "Nếu triệu chứng lan rất nhanh hoặc cây có dấu hiệu héo rũ/thối mềm",
                    "Nếu đã chụp lại nhiều lần vẫn ra 'chưa xác định'",
                ],
            }

        if "healthy" in (disease_label or "").lower():
            return {
                "immediate": [
                    "Duy trì tưới vừa đủ và ưu tiên tưới gốc",
                    "Giữ tán lá thông thoáng, tránh để lá ướt lâu vào chiều tối",
                ],
                "monitor": [
                    "Kiểm tra định kỳ 2-3 ngày/lần: đốm mới, vàng lá, sâu hại",
                    "Theo dõi sau mưa/ẩm kéo dài vì bệnh dễ bùng phát",
                ],
                "consult": [
                    "Nếu xuất hiện triệu chứng mới và lan nhanh",
                    "Nếu cây giảm sinh trưởng rõ rệt hoặc rụng lá nhiều",
                ],
            }

        immediate, monitor, consult = self._build_checklist_from_text(summary)

        if not immediate:
            immediate = [
                "Cắt bỏ lá bệnh nặng (nếu có) và vệ sinh tàn dư",
                "Giữ tán lá khô, thông thoáng; hạn chế tưới phun lên lá",
            ]

        if not monitor:
            monitor = [
                "Theo dõi trong 2-3 ngày: mức độ lan rộng, lá mới có xuất hiện đốm không",
                "Kiểm tra cây lân cận để phát hiện sớm lây lan",
            ]

        if not consult:
            consult = [
                "Nếu bệnh lan nhanh, cây héo rũ hoặc xuất hiện thối/rụng lá nhiều",
                "Nếu đã xử lý 3-5 ngày nhưng không cải thiện",
            ]

        return {
            "immediate": immediate,
            "monitor": monitor,
            "consult": consult,
        }

    def _build_checklist_from_text(self, text: str) -> tuple[list[str], list[str], list[str]]:
        segments = self._tokenize_vi(text)

        immediate: list[str] = []
        monitor: list[str] = []
        consult: list[str] = []

        for seg in segments:
            bucket = self._classify_vi_segment(seg)
            if bucket == "monitor":
                monitor.append(seg)
            elif bucket == "consult":
                consult.append(seg)
            else:
                immediate.append(seg)

        immediate = self._dedupe_preserve_order(immediate)
        monitor = self._dedupe_preserve_order(monitor)
        consult = self._dedupe_preserve_order(consult)

        return immediate, monitor, consult

    def _tokenize_vi(self, text: str) -> list[str]:
        cleaned = re.sub(r"\s+", " ", str(text or "").strip())
        if not cleaned:
            return []

        sentences = re.split(r"[.;。]+", cleaned)
        segments: list[str] = []
        for sentence in sentences:
            for part in sentence.split(","):
                seg = part.strip()
                if not seg:
                    continue
                seg = re.sub(r"^(và|hoặc)\s+", "", seg, flags=re.IGNORECASE)
                if seg:
                    segments.append(seg)
        return segments

    def _classify_vi_segment(self, segment: str) -> str:
        low = segment.lower()

        monitor_keywords = [
            "theo dõi",
            "kiểm tra",
            "định kỳ",
            "mỗi ngày",
            "24-48",
            "2-3",
            "3-5",
        ]
        if any(k in low for k in monitor_keywords):
            return "monitor"

        consult_keywords = [
            "khuyến cáo",
            "hướng dẫn",
            "chuyên môn",
            "địa phương",
            "tư vấn",
            "đặc trị",
            "cân nhắc",
        ]
        if any(k in low for k in consult_keywords):
            return "consult"

        return "immediate"

    def _dedupe_preserve_order(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            key = item.strip()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append(key)
        return out
