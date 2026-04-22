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
const step2AllowedClassCount = document.getElementById("step2AllowedClassCount");
const step2FinalDisease = document.getElementById("step2FinalDisease");
const step2FinalConfidence = document.getElementById("step2FinalConfidence");
const step2Recommendation = document.getElementById("step2Recommendation");
const step2Message = document.getElementById("step2Message");
const step2PerImageList = document.getElementById("step2PerImageList");

const errorEl = document.getElementById("error");

let step1File = null;
let step2Files = [];
let confirmedPlantLabel = null;
let step2PreviewUrls = [];
let step1Candidates = [];

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

function resetStep1Result() {
  step1Result.classList.add("hidden");
  step1Status.textContent = "-";
  step1PlantLabel.textContent = "-";
  step1PlantConfidence.textContent = "-";
  step1Margin.textContent = "-";
  step1LeafCount.textContent = "-";
  step1NeedConfirm.textContent = "-";
  step1Message.textContent = "";
  step1Candidates = [];
  step1CandidateSelect.innerHTML = "";
  step1ConfirmSection.classList.add("hidden");
  step1ConfirmedNote.textContent = "Chua xac nhan loai cay.";
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
    img.alt = `Preview ${file.name}`;
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
  step2AllowedClassCount.textContent = "-";
  step2FinalDisease.textContent = "-";
  step2FinalConfidence.textContent = "-";
  step2Recommendation.textContent = "-";
  step2Message.textContent = "";
  step2PerImageList.innerHTML = "";
}

function updateStep2ButtonState() {
  const hasValidPlant = !!confirmedPlantLabel && confirmedPlantLabel !== "unknown_plant";
  step2DetectBtn.disabled = !(hasValidPlant && step2Files.length > 0);
}

function updateSelectedPlantDisplay() {
  if (confirmedPlantLabel && confirmedPlantLabel !== "unknown_plant") {
    selectedPlantLabel.textContent = confirmedPlantLabel;
  } else {
    selectedPlantLabel.textContent = "Chua xac nhan";
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
    option.textContent = `${item.label} (${formatPercent(item.confidence)})`;
    step1CandidateSelect.appendChild(option);
  });

  step1ConfirmSection.classList.remove("hidden");
}

function resetStep2Workflow() {
  step2Files = [];
  step2ImageInput.value = "";
  step2FileSummary.textContent = "Chua chon anh buoc 2.";
  clearStep2Preview();
  resetStep2Result();
  updateStep2ButtonState();
}

function resetAllWorkflow() {
  clearError();

  step1File = null;
  confirmedPlantLabel = null;

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
    showError("Buoc 1 chi chap nhan file anh JPG/PNG.");
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
    showError("Ban chua chon anh cho Buoc 1.");
    return;
  }

  clearError();
  resetStep1Result();
  confirmedPlantLabel = null;
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
      showError(data.detail || "Buoc 1 that bai.");
      return;
    }

    step1Status.textContent = data.status || "ok";
    step1PlantLabel.textContent = data.plant_label || "unknown_plant";
    step1PlantConfidence.textContent = formatPercent(data.plant_confidence);
    step1Margin.textContent = formatPercent(data.top1_top2_margin);
    step1LeafCount.textContent = `${data.leaf_candidate_count ?? 0}`;
    step1NeedConfirm.textContent = data.requires_confirmation ? "Co" : "Khong";
    step1Message.textContent = data.message || "";
    step1Result.classList.remove("hidden");

    step1Candidates = Array.isArray(data.top_candidates) ? data.top_candidates : [];
    renderStep1CandidateOptions(step1Candidates);

    if (data.too_many_leaves) {
      step1ConfirmedNote.textContent = "Buoc 1 bi chan: anh co qua nhieu la. Hay crop/chup lai chi con 1 la.";
      showError(data.message || "Anh co qua nhieu la, hay chup lai chi 1 la.");
    } else if (data.auto_confirmed && data.plant_label && data.plant_label !== "unknown_plant") {
      step1ConfirmSection.classList.add("hidden");
      setConfirmedPlantLabel(data.plant_label, `Da tu dong xac nhan: ${data.plant_label}.`);
    } else if (data.can_confirm && step1Candidates.length > 0) {
      step1ConfirmedNote.textContent = "Can xac nhan loai cay truoc khi chay Buoc 2.";
      showError(data.message || "Buoc 1 can xac nhan thu cong.");
    } else {
      step1ConfirmedNote.textContent = "Chua the xac nhan loai cay. Hay chup anh ro hon.";
      showError(data.message || "Khong the xac nhan loai cay o Buoc 1.");
    }
  } catch (error) {
    showError("Khong ket noi duoc server cho Buoc 1.");
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
    showError("Hay chon loai cay trong danh sach goi y de xac nhan.");
    return;
  }

  setConfirmedPlantLabel(selected, `Ban da xac nhan loai cay: ${selected}.`);
});

step2ImageInput.addEventListener("change", () => {
  clearError();
  resetStep2Result();

  const files = Array.from(step2ImageInput.files || []);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (files.length !== imageFiles.length) {
    showError("Buoc 2 bo qua mot so file khong phai anh.");
  }

  step2Files = imageFiles;

  if (step2Files.length === 0) {
    step2FileSummary.textContent = "Chua chon anh buoc 2.";
  } else {
    step2FileSummary.textContent = `Da chon ${step2Files.length} anh cho Buoc 2.`;
  }

  renderStep2Preview(step2Files);

  updateStep2ButtonState();
});

resetAllBtn.addEventListener("click", () => {
  resetAllWorkflow();
});

step2DetectBtn.addEventListener("click", async () => {
  if (!confirmedPlantLabel || confirmedPlantLabel === "unknown_plant") {
    showError("Can xac nhan loai cay o Buoc 1 truoc khi chay Buoc 2.");
    return;
  }

  if (step2Files.length === 0) {
    showError("Ban chua chon anh cho Buoc 2.");
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
    step2Files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch("/api/step2/disease", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      showError(data.detail || "Buoc 2 that bai.");
      return;
    }

    step2Status.textContent = data.status || "ok";
    step2ImageCount.textContent = `${data.image_count ?? 0}`;
    step2SuccessCount.textContent = `${data.successful_images ?? 0}`;
    step2FailCount.textContent = `${data.failed_images ?? 0}`;
    step2AllowedClassCount.textContent = `${data.step2_allowed_classes ?? 0}`;
    step2FinalDisease.textContent = data.final_disease_label || "-";
    step2FinalConfidence.textContent = formatPercent(data.final_disease_confidence);
    step2Recommendation.textContent = data.recommendation || "-";
    step2Message.textContent = data.message || "";

    const perImage = Array.isArray(data.per_image) ? data.per_image : [];
    step2PerImageList.innerHTML = "";
    perImage.forEach((item) => {
      const li = document.createElement("li");
      const name = item.image_name || "unknown";
      const status = item.status || "unknown";
      const disease = item.disease_label || "-";
      const conf = formatPercent(item.disease_confidence);
      const message = item.message ? ` | ${item.message}` : "";
      li.textContent = `${name} | ${status} | ${disease} | ${conf}${message}`;
      step2PerImageList.appendChild(li);
    });

    step2Result.classList.remove("hidden");
  } catch (error) {
    showError("Khong ket noi duoc server cho Buoc 2.");
  } finally {
    step2Loading.classList.add("hidden");
    updateStep2ButtonState();
  }
});

updateSelectedPlantDisplay();
updateStep2ButtonState();
