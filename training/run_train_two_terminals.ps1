param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
)

$plantRunner = Join-Path $ProjectRoot "code\training\run_train_plant.ps1"
$diseaseRunner = Join-Path $ProjectRoot "code\training\run_train_disease.ps1"

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $plantRunner
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $diseaseRunner

Write-Host "Opened 2 terminals: plant + disease"
