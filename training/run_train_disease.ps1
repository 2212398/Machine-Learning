param(
    [int]$Epochs      = 40,
    [int]$BatchSize   = 20,
    [float]$LR        = 0.0005,
    [int]$LogInterval = 5,
    [int]$NumWorkers  = 6
)

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $Python)) {
    $Python = "python"
}

$gpuCheck = & $Python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU')"
Write-Host "GPU Check: $gpuCheck"
if ($gpuCheck -like "*False*") {
    Write-Warning "CUDA khong kha dung! Training se rat cham tren CPU."
    $confirm = Read-Host "Tiep tuc tren CPU? (y/N)"
    if ($confirm -ne "y") { exit 1 }
}

$trainDir = Join-Path $ProjectRoot "PlantDisease\prepared_template_style_split\train"
$valDir = Join-Path $ProjectRoot "PlantDisease\prepared_template_style_split\val"
$output = Join-Path $ProjectRoot "code\backend\app\models\disease_efficientnet_b4.pt"
$labelOut = Join-Path $ProjectRoot "code\backend\app\labels\disease_labels_flat.json"
$plantLabels = Join-Path $ProjectRoot "code\backend\app\labels\plant_labels.json"
$diseaseMapOut = Join-Path $ProjectRoot "code\backend\app\labels\disease_labels_by_plant.json"
$scriptPath = Join-Path $ProjectRoot "code\training\train_disease_efficientnet_b4.py"
$mapScriptPath = Join-Path $ProjectRoot "code\training\generate_disease_map.py"
$trainArgs = @(
    $scriptPath,
    "--data-dir", $trainDir,
    "--val-dir", $valDir,
    "--epochs", $Epochs,
    "--batch-size", $BatchSize,
    "--lr", $LR,
    "--log-interval", $LogInterval,
    "--num-workers", $NumWorkers,
    "--output", $output,
    "--label-output", $labelOut
)
$mapArgs = @(
    $mapScriptPath,
    "--disease-labels", $labelOut,
    "--plant-labels", $plantLabels,
    "--output", $diseaseMapOut
)

Write-Host "[Disease Train] Start"
Write-Host "train=$trainDir"
Write-Host "val=$valDir"

Set-Location (Join-Path $ProjectRoot "code\training")
& $Python @trainArgs
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $Python @mapArgs
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
