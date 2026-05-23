param(
    [int]$Epochs      = 30,
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

$trainDir = Join-Path $ProjectRoot "PlantDisease\prepared_template_style_plant_split\train"
$valDir = Join-Path $ProjectRoot "PlantDisease\prepared_template_style_plant_split\val"
$output = Join-Path $ProjectRoot "code\backend\app\models\plant_efficientnet_b4.pt"
$labelOut = Join-Path $ProjectRoot "code\backend\app\labels\plant_labels.json"
$scriptPath = Join-Path $ProjectRoot "code\training\train_plant_efficientnet_b4.py"
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

Write-Host "[Plant Train] Start"
Write-Host "train=$trainDir"
Write-Host "val=$valDir"

Set-Location (Join-Path $ProjectRoot "code\training")
& $Python @trainArgs
