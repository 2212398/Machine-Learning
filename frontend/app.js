const step1ImageInput = document.getElementById("step1ImageInput");
const step1PreviewImage = document.getElementById("step1PreviewImage");
const step1EmptyPreview = document.getElementById("step1EmptyPreview");
const step1DetectBtn = document.getElementById("step1DetectBtn");
const step1Loading = document.getElementById("step1Loading");
const step1Result = document.getElementById("step1Result");
const step1Status = document.getElementById("step1Status");
const step1PlantLabel = document.getElementById("step1PlantLabel");
const step1PlantConfidence = document.getElementById("step1PlantConfidence");
const step1Margin = document.getElementById("step1Margin");
const step1LeafCount = document.getElementById("step1LeafCount");
const step1NeedConfirm = document.getElementById("step1NeedConfirm");
const step1Message = document.getElementById("step1Message");
const step1RetakeTips = document.getElementById("step1RetakeTips");
const step1RetakeList = document.getElementById("step1RetakeList");
const step1RetakeExample = document.getElementById("step1RetakeExample");
const step1ConfirmSection = document.getElementById("step1ConfirmSection");
const step1CandidateSelect = document.getElementById("step1CandidateSelect");
const step1ConfirmBtn = document.getElementById("step1ConfirmBtn");
const step1ConfirmedNote = document.getElementById("step1ConfirmedNote");
const resetAllBtn = document.getElementById("resetAllBtn");

const selectedPlantLabel = document.getElementById("selectedPlantLabel");
const step2ImageInput = document.getElementById("step2ImageInput");
const step2FileSummary = document.getElementById("step2FileSummary");
const step2PreviewSection = document.getElementById("step2PreviewSection");
const step2PreviewGrid = document.getElementById("step2PreviewGrid");
const step2DetectBtn = document.getElementById("step2DetectBtn");
const step2Loading = document.getElementById("step2Loading");
const step2Result = document.getElementById("step2Result");
const step2Status = document.getElementById("step2Status");
const step2ImageCount = document.getElementById("step2ImageCount");
const step2SuccessCount = document.getElementById("step2SuccessCount");
const step2FailCount = document.getElementById("step2FailCount");
const step2MismatchCount = document.getElementById("step2MismatchCount");
const step2AllowedClassCount = document.getElementById("step2AllowedClassCount");
const step2FinalDisease = document.getElementById("step2FinalDisease");
const step2FinalConfidence = document.getElementById("step2FinalConfidence");
const step2Recommendation = document.getElementById("step2Recommendation");
const step2RetakeTips = document.getElementById("step2RetakeTips");
const step2RetakeList = document.getElementById("step2RetakeList");
const step2RetakeExample = document.getElementById("step2RetakeExample");
const step2Checklist = document.getElementById("step2Checklist");
const step2ChecklistImmediate = document.getElementById("step2ChecklistImmediate");
const step2ChecklistMonitor = document.getElementById("step2ChecklistMonitor");
const step2ChecklistConsult = document.getElementById("step2ChecklistConsult");
const step2Message = document.getElementById("step2Message");
const step2PerImageList = document.getElementById("step2PerImageList");

const errorEl = document.getElementById("error");

let step1File = null;
let step2Files = [];
let confirmedPlantLabel = null;
let step2AccessToken = null;
let step2PreviewUrls = [];
let step1Candidates = [];

const PLANT_LABEL_VI = {
  Apple: "Táo",
  Cherry: "Anh đào",
  Corn: "Ngô",
  Grape: "Nho",
  Peach: "Đào",
  "Pepper,_bell": "Ớt chuông",
  pepper: "Ớt",
  Potato: "Khoai tây",
  Strawberry: "Dâu tây",
  Tomato: "Cà chua",
  unknown_plant: "Cây chưa xác định",
};

const DISEASE_LABEL_VI = {
  Apple_scab: "Bệnh ghẻ táo",
  Black_rot: "Thối đen",
  Cedar_apple_rust: "Gỉ sắt táo tuyết tùng",
  healthy: "Khỏe mạnh",
  Powdery_mildew: "Phấn trắng",
  "Cercospora_leaf_spot Gray_leaf_spot": "Đốm lá Cercospora (đốm xám)",
  Common_rust: "Gỉ sắt thông thường",
  Northern_Leaf_Blight: "Cháy lá phương bắc",
  "Esca_(Black_Measles)": "Bệnh Esca (đốm đen)",
  "Leaf_blight_(Isariopsis_Leaf_Spot)": "Cháy lá (đốm lá Isariopsis)",
  Bacterial_spot: "Đốm vi khuẩn",
  Early_blight: "Cháy lá sớm",
  Late_blight: "Cháy lá muộn",
  Leaf_scorch: "Cháy lá",
  Leaf_Mold: "Mốc lá",
  Septoria_leaf_spot: "Đốm lá Septoria",
  "Spider_mites Two-spotted_spider_mite": "Nhện đỏ hai chấm",
  Target_Spot: "Đốm mục tiêu",
  Tomato_mosaic_virus: "Virus khảm cà chua",
  Tomato_Yellow_Leaf_Curl_Virus: "Virus xoăn vàng lá cà chua",
  unknown_disease: "Bệnh chưa xác định",
};

function normalizeEnglishLabel(labelPart) {
  return String(labelPart || "")
    .replace(/,_/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPlantLabelVietnamese(label) {
  const raw = String(label || "").trim();
  if (!raw || raw === "-") {
    return "-";
  }

  return PLANT_LABEL_VI[raw] || normalizeEnglishLabel(raw);
}

function formatDiagnosisLabelBilingual(label) {
  const raw = String(label || "").trim();
  if (!raw || raw === "-") {
    return "-";
  }

  if (!raw.includes("___")) {
    const english = normalizeEnglishLabel(raw);
    const vietnamese = DISEASE_LABEL_VI[raw] || english;
    return vietnamese === english ? vietnamese : `${vietnamese} (${english})`;
  }

  const [plantRaw, diseaseRaw] = raw.split("___");
  const plantEn = normalizeEnglishLabel(plantRaw);
  const diseaseEn = normalizeEnglishLabel(diseaseRaw);
  const plantVi = PLANT_LABEL_VI[plantRaw] || plantEn;
  const diseaseVi = DISEASE_LABEL_VI[diseaseRaw] || diseaseEn;

  return `${plantVi} - ${diseaseVi} (${plantEn} - ${diseaseEn})`;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function formatPercent(confidence) {
  const num = Number(confidence);
  if (!Number.isFinite(num)) {
    return "-";
  }
  return `${(num * 100).toFixed(1)}%`;
}

function formatStep1Status(status) {
  const key = String(status || "").trim();
  const map = {
    ok: "Thành công",
    needs_confirmation: "Cần xác nhận thêm",
    low_confidence_plant: "Độ tin cậy thấp",
    too_many_leaves: "Ảnh chưa phù hợp",
    leaf_not_found: "Không phát hiện lá",
    model_missing: "Thiếu mô hình",
  };

  return map[key] || key || "-";
}

function formatStep2Status(status) {
  const key = String(status || "").trim();
  const map = {
    ok: "Thành công",
    low_confidence_disease: "Độ tin cậy bệnh thấp",
    no_valid_images: "Không có ảnh hợp lệ",
    plant_mismatch_detected: "Lệch loại cây",
    partial_plant_mismatch: "Có ảnh lệch loại cây",
    plant_unverified_detected: "Không đủ tin cậy xác minh cây",
    partial_plant_unverified: "Có ảnh không đủ tin cậy xác minh cây",
    partial_duplicate_image: "Có ảnh trùng lặp",
  };

  return map[key] || key || "-";
}

function formatStep2ImageStatus(status) {
  const key = String(status || "").trim();
  const map = {
    ok: "Hợp lệ",
    low_confidence_disease: "Tin cậy bệnh thấp",
    invalid_file: "File không hợp lệ",
    file_too_large: "Ảnh quá nặng",
    invalid_image: "Ảnh lỗi",
    leaf_not_found: "Không phát hiện lá",
    plant_mismatch: "Lệch loại cây",
    plant_unverified: "Không đủ tin cậy xác minh cây",
    duplicate_image: "Ảnh trùng lặp",
  };

  return map[key] || key || "-";
}

function resetStep1Result() {
  step1Result.classList.add("hidden");
  step1Status.textContent = "-";
  step1PlantLabel.textContent = "-";
  step1PlantConfidence.textContent = "-";
  step1Margin.textContent = "-";
  step1LeafCount.textContent = "-";
  step1NeedConfirm.textContent = "-";
  step1Message.textContent = "";
  step1RetakeTips.classList.add("hidden");
  step1RetakeList.innerHTML = "";
  step1RetakeExample.textContent = "";
  step1Candidates = [];
  step1CandidateSelect.innerHTML = "";
  step1ConfirmSection.classList.add("hidden");
  step1ConfirmedNote.textContent = "Trạng thái xác nhận: Chưa xác nhận.";
}

function clearStep2Preview() {
  step2PreviewUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  step2PreviewUrls = [];
  step2PreviewGrid.innerHTML = "";
  step2PreviewSection.classList.add("hidden");
}

function renderStep2Preview(files) {
  clearStep2Preview();

  if (!files.length) {
    return;
  }

  files.forEach((file) => {
    const objectUrl = URL.createObjectURL(file);
    step2PreviewUrls.push(objectUrl);

    const item = document.createElement("figure");
    item.className = "preview-item";

    const img = document.createElement("img");
    img.src = objectUrl;
    img.alt = `Xem trước ${file.name}`;
    img.loading = "lazy";

    const caption = document.createElement("figcaption");
    caption.textContent = file.name;

    item.appendChild(img);
    item.appendChild(caption);
    step2PreviewGrid.appendChild(item);
  });

  step2PreviewSection.classList.remove("hidden");
}

function resetStep2Result() {
  step2Result.classList.add("hidden");
  step2Status.textContent = "-";
  step2ImageCount.textContent = "-";
  step2SuccessCount.textContent = "-";
  step2FailCount.textContent = "-";
  step2MismatchCount.textContent = "-";
  step2AllowedClassCount.textContent = "-";
  step2FinalDisease.textContent = "-";
  step2FinalConfidence.textContent = "-";
  step2Recommendation.textContent = "-";
  step2RetakeTips.classList.add("hidden");
  step2RetakeList.innerHTML = "";
  step2RetakeExample.textContent = "";
  step2Checklist.classList.add("hidden");
  step2ChecklistImmediate.innerHTML = "";
  step2ChecklistMonitor.innerHTML = "";
  step2ChecklistConsult.innerHTML = "";
  step2Message.textContent = "";
  step2PerImageList.innerHTML = "";
}

function renderRetakeTips(tipsEl, listEl, exampleEl, tips, exampleText) {
  listEl.innerHTML = "";
  const arr = Array.isArray(tips) ? tips : [];
  arr.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = String(text || "").trim();
    listEl.appendChild(li);
  });
  exampleEl.textContent = String(exampleText || "").trim();
  tipsEl.classList.remove("hidden");
}

function hideRetakeTips(tipsEl, listEl, exampleEl) {
  tipsEl.classList.add("hidden");
  listEl.innerHTML = "";
  exampleEl.textContent = "";
}

function getPhotoExampleText() {
  return "Ví dụ: Chụp 1 lá, nền trơn (giấy/tường sáng), ánh sáng đều.";
}

function buildRetakeTipsForReason(reason) {
  const key = String(reason || "").trim();

  if (key === "too_many_leaves") {
    return {
      tips: [
        "Chụp/crop lại để chỉ còn 1 lá rõ nét (lá chiếm ~50–80% khung hình)",
        "Tránh nhiều lá chồng lên nhau hoặc khung hình quá rộng",
        "Chọn nền trơn, ít vật thể để dễ nhận diện",
      ],
      example: getPhotoExampleText(),
    };
  }

  if (key === "leaf_not_found") {
    return {
      tips: [
        "Đảm bảo ảnh có lá và không bị che khuất; chụp gần hơn",
        "Ưu tiên nền trơn, tương phản với lá (giấy trắng/tường sáng)",
        "Ánh sáng đủ và đều; tránh tối hoặc flash gắt gây chói",
      ],
      example: getPhotoExampleText(),
    };
  }

  if (key === "low_confidence") {
    return {
      tips: [
        "Mờ/rung: giữ máy chắc, chạm lấy nét vào vùng đốm rồi chụp lại",
        "Ngược sáng: quay lưng khỏi nguồn sáng mạnh hoặc chụp ở bóng râm",
        "Chụp gần hơn để thấy rõ vết bệnh; tránh ảnh quá xa",
        "Chỉ chụp 1 lá và nền trơn để giảm nhiễu",
      ],
      example: getPhotoExampleText(),
    };
  }

  return null;
}

function renderStep1RetakeTipsFromResult(data) {
  const status = String(data?.status || "").trim();
  const plantLabel = String(data?.plant_label || "").trim();

  let payload = null;
  if (status === "too_many_leaves" || data?.too_many_leaves) {
    payload = buildRetakeTipsForReason("too_many_leaves");
  } else if (status === "low_confidence_plant" || status === "needs_confirmation" || plantLabel === "unknown_plant") {
    payload = buildRetakeTipsForReason("low_confidence");
  }

  if (!payload) {
    hideRetakeTips(step1RetakeTips, step1RetakeList, step1RetakeExample);
    return;
  }

  renderRetakeTips(step1RetakeTips, step1RetakeList, step1RetakeExample, payload.tips, payload.example);
}

function renderStep2RetakeTipsFromResult(data) {
  const status = String(data?.status || "").trim();
  const finalLabel = String(data?.final_disease_label || "").trim();
  const perImage = Array.isArray(data?.per_image) ? data.per_image : [];

  let payload = null;
  if (status === "low_confidence_disease" || finalLabel.endsWith("unknown_disease")) {
    payload = buildRetakeTipsForReason("low_confidence");
  } else if (status === "no_valid_images") {
    const leafNotFoundCount = perImage.filter((x) => String(x?.status || "") === "leaf_not_found").length;
    if (leafNotFoundCount > 0) {
      payload = buildRetakeTipsForReason("leaf_not_found");
    } else {
      payload = buildRetakeTipsForReason("low_confidence");
    }
  }

  if (!payload) {
    hideRetakeTips(step2RetakeTips, step2RetakeList, step2RetakeExample);
    return;
  }

  renderRetakeTips(step2RetakeTips, step2RetakeList, step2RetakeExample, payload.tips, payload.example);
}

function renderChecklistList(listEl, items) {
  listEl.innerHTML = "";
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) {
    const li = document.createElement("li");
    li.textContent = "Chưa có gợi ý cụ thể.";
    listEl.appendChild(li);
    return;
  }

  arr.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = String(text || "").trim();
    listEl.appendChild(li);
  });
}

function renderStep2Checklist(checklist) {
  if (!checklist || typeof checklist !== "object") {
    step2Checklist.classList.add("hidden");
    return;
  }

  renderChecklistList(step2ChecklistImmediate, checklist.immediate);
  renderChecklistList(step2ChecklistMonitor, checklist.monitor);
  renderChecklistList(step2ChecklistConsult, checklist.consult);
  step2Checklist.classList.remove("hidden");
}

function updateStep2ButtonState() {
  const hasValidPlant = !!confirmedPlantLabel && confirmedPlantLabel !== "unknown_plant";
  const hasToken = !!step2AccessToken;
  step2DetectBtn.disabled = !(hasValidPlant && step2Files.length > 0 && hasToken);
}

function updateSelectedPlantDisplay() {
  if (confirmedPlantLabel && confirmedPlantLabel !== "unknown_plant") {
    selectedPlantLabel.textContent = formatPlantLabelVietnamese(confirmedPlantLabel);
  } else {
    selectedPlantLabel.textContent = "Chưa xác nhận";
  }
}

function setConfirmedPlantLabel(label, noteMessage) {
  confirmedPlantLabel = label;
  step1ConfirmedNote.textContent = noteMessage;
  updateSelectedPlantDisplay();
  updateStep2ButtonState();
}

function renderStep1CandidateOptions(candidates) {
  step1CandidateSelect.innerHTML = "";
  const valid = candidates.filter((item) => item && item.label && item.label !== "unknown_plant");

  if (!valid.length) {
    step1ConfirmSection.classList.add("hidden");
    return;
  }

  valid.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.label;
    option.textContent = `${formatPlantLabelVietnamese(item.label)} (${formatPercent(item.confidence)})`;
    step1CandidateSelect.appendChild(option);
  });

  step1ConfirmSection.classList.remove("hidden");
}

function resetStep2Workflow() {
  step2Files = [];
  step2ImageInput.value = "";
  step2FileSummary.textContent = "Chưa chọn ảnh bước 2.";
  clearStep2Preview();
  resetStep2Result();
  updateStep2ButtonState();
}

function resetAllWorkflow() {
  clearError();

  step1File = null;
  confirmedPlantLabel = null;
  step2AccessToken = null;

  step1ImageInput.value = "";
  step1PreviewImage.src = "";
  step1PreviewImage.style.display = "none";
  step1EmptyPreview.style.display = "block";
  step1DetectBtn.disabled = true;
  step1Loading.classList.add("hidden");
  resetStep1Result();

  step2Loading.classList.add("hidden");
  resetStep2Workflow();
  updateSelectedPlantDisplay();
}

step1ImageInput.addEventListener("change", () => {
  clearError();
  resetStep1Result();
  confirmedPlantLabel = null;
  step2AccessToken = null;
  updateSelectedPlantDisplay();
  resetStep2Workflow();

  const file = step1ImageInput.files && step1ImageInput.files[0];
  if (!file) {
    step1File = null;
    step1DetectBtn.disabled = true;
    step1PreviewImage.style.display = "none";
    step1EmptyPreview.style.display = "block";
    return;
  }

  if (!file.type.startsWith("image/")) {
    showError("Bước 1 chỉ chấp nhận file ảnh JPG/PNG.");
    step1ImageInput.value = "";
    step1File = null;
    step1DetectBtn.disabled = true;
    return;
  }

  step1File = file;
  step1DetectBtn.disabled = false;

  const reader = new FileReader();
  reader.onload = (event) => {
    step1PreviewImage.src = event.target.result;
    step1PreviewImage.style.display = "block";
    step1EmptyPreview.style.display = "none";
  };
  reader.readAsDataURL(file);
});

step1DetectBtn.addEventListener("click", async () => {
  if (!step1File) {
    showError("Bạn chưa chọn ảnh cho Bước 1.");
    return;
  }

  clearError();
  resetStep1Result();
  confirmedPlantLabel = null;
  step2AccessToken = null;
  updateSelectedPlantDisplay();
  resetStep2Workflow();
  step1Loading.classList.remove("hidden");
  step1DetectBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("file", step1File);

    const response = await fetch("/api/step1/plant", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      const detail = data.detail || "Bước 1 thất bại.";
      showError(detail);

      if (response.status === 422) {
        step1Status.textContent = formatStep1Status("leaf_not_found");
        step1PlantLabel.textContent = formatPlantLabelVietnamese("unknown_plant");
        step1PlantConfidence.textContent = "-";
        step1Margin.textContent = "-";
        step1LeafCount.textContent = "0";
        step1NeedConfirm.textContent = "Có";
        step1Message.textContent = detail;
        step1Result.classList.remove("hidden");

        const payload = buildRetakeTipsForReason("leaf_not_found");
        if (payload) {
          renderRetakeTips(step1RetakeTips, step1RetakeList, step1RetakeExample, payload.tips, payload.example);
        }
      }
      return;
    }

    step2AccessToken = data.step2_access_token || null;

    step1Status.textContent = formatStep1Status(data.status || "ok");
    step1PlantLabel.textContent = formatPlantLabelVietnamese(data.plant_label || "unknown_plant");
    step1PlantConfidence.textContent = formatPercent(data.plant_confidence);
    step1Margin.textContent = formatPercent(data.top1_top2_margin);
    step1LeafCount.textContent = `${data.leaf_candidate_count ?? 0}`;
    step1NeedConfirm.textContent = data.requires_confirmation ? "Có" : "Không";
    step1Message.textContent = data.message || "";
    step1Result.classList.remove("hidden");

    renderStep1RetakeTipsFromResult(data);

    step1Candidates = Array.isArray(data.top_candidates) ? data.top_candidates : [];
    renderStep1CandidateOptions(step1Candidates);

    if (data.too_many_leaves) {
      step1ConfirmedNote.textContent = "Trạng thái xác nhận: Không thể xác nhận từ ảnh hiện tại.";
      showError(data.message || "Ảnh có quá nhiều lá, hãy chụp lại chỉ 1 lá.");
    } else if (data.auto_confirmed && data.plant_label && data.plant_label !== "unknown_plant") {
      step1ConfirmSection.classList.add("hidden");
      const autoConfirmMessage = `Hệ thống đã tự động xác nhận loại cây: ${formatPlantLabelVietnamese(data.plant_label)}.`;
      step1Message.textContent = autoConfirmMessage;
      setConfirmedPlantLabel(data.plant_label, "Trạng thái xác nhận: Tự động (đủ tin cậy).");
    } else if (data.can_confirm && step1Candidates.length > 0) {
      step1ConfirmedNote.textContent = "Trạng thái xác nhận: Chờ bạn xác nhận thủ công.";
      showError(data.message || "Bước 1 cần xác nhận thủ công.");
    } else {
      step1ConfirmedNote.textContent = "Trạng thái xác nhận: Chưa xác nhận.";
      showError(data.message || "Không thể xác nhận loại cây ở Bước 1.");
    }
  } catch (error) {
    showError("Không kết nối được server cho Bước 1.");
  } finally {
    step1Loading.classList.add("hidden");
    step1DetectBtn.disabled = !step1File;
    updateStep2ButtonState();
  }
});

step1ConfirmBtn.addEventListener("click", () => {
  clearError();

  const selected = step1CandidateSelect.value;
  if (!selected) {
    showError("Hãy chọn loại cây trong danh sách gợi ý để xác nhận.");
    return;
  }

  step1Message.textContent = `Bạn đã xác nhận loại cây: ${formatPlantLabelVietnamese(selected)}.`;
  setConfirmedPlantLabel(selected, "Trạng thái xác nhận: Thủ công.");
});

step2ImageInput.addEventListener("change", () => {
  clearError();
  resetStep2Result();

  const files = Array.from(step2ImageInput.files || []);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (files.length !== imageFiles.length) {
    showError("Bước 2 bỏ qua một số file không phải ảnh.");
  }

  step2Files = imageFiles;

  if (step2Files.length === 0) {
    step2FileSummary.textContent = "Chưa chọn ảnh bước 2.";
  } else {
    step2FileSummary.textContent = `Đã chọn ${step2Files.length} ảnh cho Bước 2.`;
  }

  renderStep2Preview(step2Files);

  updateStep2ButtonState();
});

resetAllBtn.addEventListener("click", () => {
  resetAllWorkflow();
});

step2DetectBtn.addEventListener("click", async () => {
  if (!confirmedPlantLabel || confirmedPlantLabel === "unknown_plant") {
    showError("Cần xác nhận loại cây ở Bước 1 trước khi chạy Bước 2.");
    return;
  }

  if (!step2AccessToken) {
    showError("Thiếu token cho Bước 2. Hãy chạy lại Bước 1.");
    updateStep2ButtonState();
    return;
  }

  if (step2Files.length === 0) {
    showError("Bạn chưa chọn ảnh cho Bước 2.");
    return;
  }

  clearError();
  resetStep2Result();
  step2Loading.classList.remove("hidden");
  step2DetectBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("confirmed_plant_label", confirmedPlantLabel);
    formData.append("plant_confirmed", "true");
    formData.append("step2_access_token", step2AccessToken);
    step2Files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch("/api/step2/disease", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        step2AccessToken = null;
        updateStep2ButtonState();
      }
      showError(data.detail || "Bước 2 thất bại.");
      return;
    }

    step2Status.textContent = formatStep2Status(data.status || "ok");
    step2ImageCount.textContent = `${data.image_count ?? 0}`;
    step2SuccessCount.textContent = `${data.successful_images ?? 0}`;
    step2FailCount.textContent = `${data.failed_images ?? 0}`;
    step2MismatchCount.textContent = `${data.mismatched_plant_images ?? 0}`;
    step2AllowedClassCount.textContent = `${data.step2_allowed_classes ?? 0}`;
    step2FinalDisease.textContent = formatDiagnosisLabelBilingual(data.final_disease_label || "-");
    step2FinalConfidence.textContent = formatPercent(data.final_disease_confidence);
    step2Recommendation.textContent = data.recommendation || "-";
    renderStep2RetakeTipsFromResult(data);
    renderStep2Checklist(data.recommendation_checklist);
    step2Message.textContent = data.message || "";

    const perImage = Array.isArray(data.per_image) ? data.per_image : [];
    step2PerImageList.innerHTML = "";
    perImage.forEach((item) => {
      const li = document.createElement("li");
      const name = item.image_name || "unknown";
      const status = formatStep2ImageStatus(item.status || "unknown");
      const disease = formatDiagnosisLabelBilingual(item.disease_label || "-");
      const conf = formatPercent(item.disease_confidence);
      const message = item.message ? ` | ${item.message}` : "";
      li.textContent = `${name} | ${status} | ${disease} | ${conf}${message}`;
      step2PerImageList.appendChild(li);
    });

    step2Result.classList.remove("hidden");
  } catch (error) {
    showError("Không kết nối được server cho Bước 2.");
  } finally {
    step2Loading.classList.add("hidden");
    updateStep2ButtonState();
  }
});

updateSelectedPlantDisplay();
updateStep2ButtonState();
