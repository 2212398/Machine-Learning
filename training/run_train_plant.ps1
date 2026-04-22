param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path,
    [int]$Epochs = 10,
    [int]$BatchSize = 16,
    [string]$Backbone = "large",
    [int]$LogInterval = 25,
    [int]$NumWorkers = 0
)

$trainDir = Join-Path $ProjectRoot "PlantDisease\prepared_template_style_plant_split\train"
$valDir = Join-Path $ProjectRoot "PlantDisease\prepared_template_style_plant_split\val"
$output = Join-Path $ProjectRoot "code\backend\app\models\plant_mobilenetv3.pt"
$labelOut = Join-Path $ProjectRoot "code\backend\app\labels\plant_labels.json"
$scriptPath = Join-Path $ProjectRoot "code\training\train_plant_mobilenetv3.py"

Write-Host "[Plant Train] Start"
Write-Host "train=$trainDir"
Write-Host "val=$valDir"

Set-Location (Join-Path $ProjectRoot "code\training")
py $scriptPath --data-dir $trainDir --val-dir $valDir --epochs $Epochs --batch-size $BatchSize --backbone $Backbone --log-interval $LogInterval --num-workers $NumWorkers --output $output --label-output $labelOut
