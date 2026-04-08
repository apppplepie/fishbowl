# fishbowl: prune build cache, docker build, docker push (default creepender42/fishbowl:latest).
# Repo root:
#   .\scripts\dbp.ps1
# Other registry prefix:
#   $env:DOCKER_HUB_USER = "you"; .\scripts\dbp.ps1
#   .\scripts\dbp.ps1 -Registry "registry.example.com/ns"
# Build only (no push):
#   .\scripts\dbp.ps1 -NoPush
# Keep BuildKit cache (skip prune):
#   .\scripts\dbp.ps1 -SkipPrune
# Tag:
#   .\scripts\dbp.ps1 -Tag "v1.0.0"

param(
    [string]$Registry = $env:DOCKER_HUB_USER,
    [string]$Tag = "latest",
    [string]$ImageName = "fishbowl",
    [switch]$NoPush,
    [switch]$SkipPrune
)

$ErrorActionPreference = "Stop"

if (-not $Registry) {
    $Registry = "creepender42"
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FullImage = "${Registry}/${ImageName}:${Tag}"

Write-Host "Image: $FullImage" -ForegroundColor Cyan
Write-Host "Context: $RepoRoot" -ForegroundColor DarkGray

if (-not $SkipPrune) {
    Write-Host "`n=== docker builder prune -a -f ===" -ForegroundColor Green
    docker builder prune -a -f
    if ($LASTEXITCODE -ne 0) {
        throw "docker builder prune failed (exit $LASTEXITCODE)"
    }
}

Push-Location $RepoRoot
try {
    Write-Host "`n=== docker build ===" -ForegroundColor Green
    docker build -t $FullImage .
    if ($LASTEXITCODE -ne 0) {
        throw "docker build failed (exit $LASTEXITCODE)"
    }
}
finally {
    Pop-Location
}

if (-not $NoPush) {
    Write-Host "`n=== docker push ===" -ForegroundColor Green
    docker push $FullImage
    if ($LASTEXITCODE -ne 0) {
        throw "docker push failed (exit $LASTEXITCODE)"
    }
    Write-Host "`nDone. Pull on server:" -ForegroundColor Cyan
    Write-Host "  docker pull $FullImage"
}
