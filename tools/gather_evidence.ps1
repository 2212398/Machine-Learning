# Gather evidence for Phase 4: logs and basic system info
$OutDir = "artifacts/phase4_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

# Docker-compose logs
Write-Host "Saving docker-compose logs..."
docker compose logs --no-color > "$OutDir/docker_compose_logs.txt" 2>&1

# Uvicorn logs (if running locally)
if (Get-Process -Name uvicorn -ErrorAction SilentlyContinue) {
    Write-Host "Saving uvicorn process list..."
    Get-Process uvicorn | Out-File "$OutDir/uvicorn_process.txt"
}

# Git status and recent commits
Write-Host "Saving git status and recent commits..."
git status --porcelain > "$OutDir/git_status.txt" 2>&1
git --no-pager log -n 50 --pretty=format:"%h %ad | %s (%an)" --date=short > "$OutDir/recent_commits.txt" 2>&1

# Docker image list
Write-Host "Saving docker images list..."
docker images --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}" > "$OutDir/docker_images.txt" 2>&1

# System info
Write-Host "Saving system info..."
Get-ComputerInfo | Out-File "$OutDir/system_info.txt"

Write-Host "Artifacts saved to $OutDir"
