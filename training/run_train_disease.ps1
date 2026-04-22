param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path,
    [int]$Epochs = 12,
    [int]$BatchSize = 16,
    [string]$Backbone = "large",
    [int]$LogInterval = 25,
    [int]$NumWorkers = 0
)

$trainDir = Join-Path $ProjectRoot "PlantDisease\prepared_template_style_split\train"
$valDir = Join-Path $ProjectRoot "PlantDisease\prepared_template_style_split\val"
$output = Join-Path $ProjectRoot "code\backend\app\models\disease_mobilenetv3.pt"
$labelOut = Join-Path $ProjectRoot "code\backend\app\labels\disease_labels_flat.json"
$scriptPath = Join-Path $ProjectRoot "code\training\train_disease_mobilenetv3.py"

Write-Host "[Disease Train] Start"
Write-Host "train=$trainDir"
Write-Host "val=$valDir"

Set-Location (Join-Path $ProjectRoot "code\training")
py $scriptPath --data-dir $trainDir --val-dir $valDir --epochs $Epochs --batch-size $BatchSize --backbone $Backbone --log-interval $LogInterval --num-workers $NumWorkers --output $output --label-output $labelOut
