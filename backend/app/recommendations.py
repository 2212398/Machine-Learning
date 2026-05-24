import json
import re
from copy import deepcopy
from pathlib import Path

RecommendationDetail = dict[str, str | list[str]]

RECOMMENDATIONS: dict[str, RecommendationDetail] = {
    "Grape___Black_rot": {
        "ten_benh": "Thối đen nho (Black Rot)",
        "nguyen_nhan": "Nấm Guignardia bidwellii - lây lan qua mưa và gió ẩm",
        "trieu_chung": "Đốm nâu tròn trên lá, viền vàng; quả chuyển đen và teo lại",
        "xu_ly": [
            "Cắt bỏ và tiêu hủy toàn bộ lá, chùm bị bệnh; không để trên đất",
            "Phun thuốc gốc đồng (Bordeaux mixture) hoặc Mancozeb sau mưa",
            "Phun định kỳ 7-10 ngày/lần trong mùa mưa",
        ],
        "phong_ngua": [
            "Tỉa cành thông thoáng, tránh để tán lá quá dày",
            "Vệ sinh vườn cuối vụ: thu gom lá rụng và quả thối",
            "Tránh tưới lên lá; ưu tiên tưới gốc hoặc nhỏ giọt",
        ],
        "muc_do": "severe",
        "thoi_gian_xu_ly": "Xử lý ngay trong vòng 24-48 giờ",
    },
    "Tomato___Early_blight": {
        "ten_benh": "Bệnh sớm bạc cà chua (Early Blight)",
        "nguyen_nhan": "Nấm Alternaria solani - tồn tại trong đất và tàn dư cây",
        "trieu_chung": "Đốm nâu vòng tâm như bia bắn, lá vàng và rụng từ dưới lên",
        "xu_ly": [
            "Loại bỏ lá bệnh và tiêu hủy, không ủ phân",
            "Phun Chlorothalonil hoặc Mancozeb 0.2% định kỳ",
            "Bón thêm kali và canxi để tăng sức đề kháng",
        ],
        "phong_ngua": [
            "Luân canh cây trồng 2-3 năm/lần",
            "Trồng thưa, đảm bảo thông gió tốt",
            "Tủ gốc để hạn chế nấm từ đất bắn lên lá",
        ],
        "muc_do": "mild",
        "thoi_gian_xu_ly": "Xử lý trong vòng 3-5 ngày",
    },
    "Tomato___Late_blight": {
        "ten_benh": "Bệnh mốc sương cà chua (Late Blight)",
        "nguyen_nhan": "Nấm Phytophthora infestans - rất nguy hiểm, lây nhanh khi ẩm",
        "trieu_chung": "Vết nâu xám có viền vàng ướt, mặt dưới lá có lớp mốc trắng",
        "xu_ly": [
            "Nhổ bỏ và tiêu hủy cây bệnh nặng ngay lập tức",
            "Phun Metalaxyl + Mancozeb hoặc Ridomil Gold khẩn cấp",
            "Phun lại sau 5-7 ngày nếu thời tiết ẩm kéo dài",
        ],
        "phong_ngua": [
            "Không trồng cà chua gần khoai tây",
            "Chọn giống kháng bệnh Late Blight",
            "Phun phòng trước khi có mưa nhiều ngày",
        ],
        "muc_do": "severe",
        "thoi_gian_xu_ly": "Xử lý NGAY trong 24 giờ - bệnh lây rất nhanh",
    },
    "Corn_(maize)___Common_rust_": {
        "ten_benh": "Gỉ sắt ngô (Common Rust)",
        "nguyen_nhan": "Nấm Puccinia sorghi - bào tử phát tán qua gió",
        "trieu_chung": "Mụn nhỏ màu nâu đỏ rải rác trên cả 2 mặt lá",
        "xu_ly": [
            "Phun Propiconazole hoặc Trifloxystrobin khi phát hiện sớm",
            "Tăng cường bón kali để lá cứng hơn",
        ],
        "phong_ngua": [
            "Trồng giống ngô kháng gỉ sắt",
            "Tránh trồng mật độ quá dày",
        ],
        "muc_do": "mild",
        "thoi_gian_xu_ly": "Xử lý trong 5-7 ngày",
    },
    "Potato___Late_blight": {
        "ten_benh": "Mốc sương khoai tây (Late Blight)",
        "nguyen_nhan": "Nấm Phytophthora infestans",
        "trieu_chung": "Vết thối nâu, ướt, mặt dưới lá có lớp mốc trắng, lan rất nhanh",
        "xu_ly": [
            "Loại bỏ ngay cây bệnh nặng",
            "Phun Metalaxyl + Mancozeb khẩn cấp",
            "Vun gốc cao để bảo vệ củ",
        ],
        "phong_ngua": [
            "Không dùng củ giống từ vụ trước có bệnh",
            "Luân canh với lúa hoặc ngô",
            "Phun phòng trước mùa mưa",
        ],
        "muc_do": "severe",
        "thoi_gian_xu_ly": "Xử lý NGAY trong 24 giờ",
    },
    "Rice___Blast": {
        "ten_benh": "Đạo ôn lúa (Rice Blast)",
        "nguyen_nhan": "Nấm Magnaporthe oryzae - rất phổ biến ở Đông Nam Á",
        "trieu_chung": "Vết nâu hình thoi trên lá, cổ bông thối đen và gãy",
        "xu_ly": [
            "Phun Tricyclazole hoặc Isoprothiolane ngay khi phát hiện",
            "Phun lại sau 7 ngày nếu bệnh chưa dừng",
            "Không bón đạm nhiều trong giai đoạn bệnh",
        ],
        "phong_ngua": [
            "Chọn giống kháng đạo ôn phù hợp vùng",
            "Bón cân đối NPK, không thừa đạm",
            "Phun phòng khi thời tiết ẩm, nhiều sương",
        ],
        "muc_do": "severe",
        "thoi_gian_xu_ly": "Xử lý ngay, đặc biệt ở giai đoạn trổ bông",
    },
    "Tomato___healthy": {
        "ten_benh": "Cây khỏe mạnh",
        "nguyen_nhan": "",
        "trieu_chung": "Không phát hiện dấu hiệu bệnh",
        "xu_ly": [],
        "phong_ngua": [
            "Tiếp tục bón phân cân đối NPK theo giai đoạn sinh trưởng",
            "Tưới nước đều đặn, tránh để đất quá khô hoặc quá ướt",
            "Kiểm tra lá định kỳ 2 lần/tuần để phát hiện sớm",
        ],
        "muc_do": "healthy",
        "thoi_gian_xu_ly": "",
    },
}

DEFAULT_RECOMMENDATION: RecommendationDetail = {
    "ten_benh": "",
    "nguyen_nhan": "Chưa có thông tin chi tiết",
    "trieu_chung": "Xem ảnh chụp để đối chiếu",
    "xu_ly": [
        "Cách ly cây bệnh với cây khỏe",
        "Tham khảo cán bộ khuyến nông địa phương",
        "Gửi mẫu lá đến trạm bảo vệ thực vật gần nhất",
    ],
    "phong_ngua": [
        "Vệ sinh vườn thường xuyên",
        "Tưới nước gốc, tránh tưới lên lá",
    ],
    "muc_do": "unknown",
    "thoi_gian_xu_ly": "Xử lý sớm nhất có thể",
}


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

    def _copy_detail(self, value: RecommendationDetail) -> RecommendationDetail:
        return deepcopy(value)

    def _detail_from_text(self, text: str, muc_do: str = "unknown") -> RecommendationDetail:
        detail = self._copy_detail(DEFAULT_RECOMMENDATION)
        detail["xu_ly"] = [text] if text else list(DEFAULT_RECOMMENDATION["xu_ly"])
        detail["muc_do"] = muc_do
        return detail

    def get(self, disease_label: str, plant_label: str) -> RecommendationDetail:
        if disease_label in RECOMMENDATIONS:
            return self._copy_detail(RECOMMENDATIONS[disease_label])

        if disease_label in self._mapping:
            return self._detail_from_text(self._mapping[disease_label])

        if "healthy" in disease_label:
            detail = self._copy_detail(RECOMMENDATIONS["Tomato___healthy"])
            detail["ten_benh"] = f"{plant_label} khỏe mạnh" if plant_label else "Cây khỏe mạnh"
            return detail

        if disease_label.endswith("unknown_disease"):
            return self._detail_from_text(
                f"Chưa xác định rõ bệnh trên {plant_label}. Bạn nên chụp ảnh rõ hơn (ánh sáng tốt, không rung) "
                "và theo dõi thêm triệu chứng trong 24-48 giờ."
            )

        return self._copy_detail(DEFAULT_RECOMMENDATION)

    def get_checklist(self, disease_label: str, plant_label: str) -> dict[str, list[str]]:
        if disease_label in self._checklists:
            checklist = self._checklists[disease_label]
            return {
                "immediate": list(checklist.get("immediate", [])),
                "monitor": list(checklist.get("monitor", [])),
                "consult": list(checklist.get("consult", [])),
            }

        recommendation = self.get(disease_label=disease_label, plant_label=plant_label)
        if isinstance(recommendation, dict):
            return {
                "immediate": self._to_str_list(recommendation.get("xu_ly")),
                "monitor": [str(recommendation.get("thoi_gian_xu_ly", ""))] if recommendation.get("thoi_gian_xu_ly") else [],
                "consult": self._to_str_list(recommendation.get("phong_ngua")),
            }

        summary = recommendation

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
