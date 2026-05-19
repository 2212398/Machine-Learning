<#
Simple helper to run the feedback exporter with environment variables.

Usage:
  .\run_export.ps1 -Url 'https://<project>.supabase.co' -Key '<service-role-key>'
#>

param(
  [Parameter(Mandatory=$true)]
  [string]$Url,
  [Parameter(Mandatory=$true)]
  [string]$Key
)

$env:SUPABASE_URL = $Url
$env:SUPABASE_SERVICE_ROLE_KEY = $Key

python .\export_feedbacks_for_retraining.py
