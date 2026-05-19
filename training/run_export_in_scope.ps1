param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path,
    [ValidateSet("plant", "disease")]
    [string]$Target = "disease",
    [string]$OutputDir = "",
    [ValidateSet("hardlink", "copy")]
    [string]$CopyMode = "hardlink",
    [ValidateSet("content-hash", "off")]
    [string]$DedupeMode = "content-hash",
    [double]$MinPlantConfidence = 0.0,
    [double]$MinDiseaseConfidence = 0.0,
    [string]$Endpoints = "",
    [string]$SinceDate = "",
    [string]$UntilDate = "",
    [int]$MaxSamples = 0,
    [switch]$CleanOutput,
    [switch]$DryRun
)

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $ProjectRoot "code\training\exports\in_scope_$Target"
}

$scriptPath = Join-Path $ProjectRoot "code\training\export_in_scope_from_manifest.py"
$archiveRoot = Join-Path $ProjectRoot "code\backend\app\upload_archive"

$args = @(
    $scriptPath,
    "--archive-root", $archiveRoot,
    "--output-root", $OutputDir,
    "--target", $Target,
    "--copy-mode", $CopyMode,
    "--dedupe-mode", $DedupeMode,
    "--min-plant-confidence", "$MinPlantConfidence",
    "--min-disease-confidence", "$MinDiseaseConfidence"
)

if (-not [string]::IsNullOrWhiteSpace($SinceDate)) {
    $args += @("--since-date", $SinceDate)
}
if (-not [string]::IsNullOrWhiteSpace($UntilDate)) {
    $args += @("--until-date", $UntilDate)
}
if (-not [string]::IsNullOrWhiteSpace($Endpoints)) {
    $args += @("--endpoints", $Endpoints)
}
if ($MaxSamples -gt 0) {
    $args += @("--max-samples", "$MaxSamples")
}
if ($CleanOutput.IsPresent) {
    $args += "--clean-output"
}
if ($DryRun.IsPresent) {
    $args += "--dry-run"
}

Write-Host "[Export In-Scope] target=$Target"
Write-Host "archive=$archiveRoot"
Write-Host "output=$OutputDir"

Set-Location (Join-Path $ProjectRoot "code\training")
py @args
