# Deploy SaarthiWorkforce Help & Support (production parity with local Docker).
#
# Run from Help-and-Support- (or any cwd — script cds to repo root):
#   .\scripts\deploy-production.ps1
#
# Options:
#   .\scripts\deploy-production.ps1 -FullRebuild
#   .\scripts\deploy-production.ps1 -SiteUrl https://help.example.com
#   .\scripts\deploy-production.ps1 -SkipNetworkCheck

[CmdletBinding()]
param(
  [switch]$FullRebuild,
  [string]$SiteUrl = "",
  [switch]$SkipNetworkCheck,
  [string]$NetworkName = "somethingx_saarthix-network"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "==> Help & Support production deploy"
Write-Host "    repo: $Root"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker is not installed or not in PATH."
}

$composeArgs = @("compose", "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml")

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.production.example") {
    Copy-Item ".env.production.example" ".env"
    throw "Created .env from .env.production.example. Fill secrets/URLs, then re-run."
  }
  throw "Missing .env — copy .env.production.example to .env and configure it."
}

function Get-DotEnvValue([string]$Key) {
  $line = Get-Content ".env" | Where-Object { $_ -match "^\s*$([regex]::Escape($Key))\s*=" } | Select-Object -First 1
  if (-not $line) { return "" }
  return ($line -replace "^\s*$Key\s*=\s*", "").Trim().Trim('"').Trim("'")
}

$appUrl = Get-DotEnvValue "APP_FRONTEND_URL"
$jwt = Get-DotEnvValue "JWT_SECRET"
$mongo = Get-DotEnvValue "MONGODB_URI"
$workforceUrl = Get-DotEnvValue "NEXT_PUBLIC_WORKFORCE_APP_URL"
$hostPort = Get-DotEnvValue "HELP_SUPPORT_HOST_PORT"
if (-not $hostPort) { $hostPort = "3003" }

if (-not $SiteUrl) { $SiteUrl = $appUrl }
if (-not $SiteUrl) { throw "Set APP_FRONTEND_URL in .env (or -SiteUrl)." }
$SiteUrl = $SiteUrl.TrimEnd("/")

if ($appUrl -match "localhost|127\.0\.0\.1" -or $workforceUrl -match "localhost|127\.0\.0\.1") {
  Write-Warning "Production .env still contains localhost URLs. Update APP_FRONTEND_URL / NEXT_PUBLIC_WORKFORCE_APP_URL / SUPPORT_WEBHOOK_BASE_URL."
}
if (-not $jwt -or $jwt -in @("CHANGE_ME_TO_A_LONG_RANDOM_SECRET", "change-this-in-production")) {
  throw "Set a real JWT_SECRET in .env (must match Employeemanage / TalentX)."
}
if (-not $mongo) { throw "MONGODB_URI is required in .env." }

if (-not $SkipNetworkCheck) {
  $exists = docker network inspect $NetworkName 2>$null
  if (-not $exists) {
    Write-Host "==> Creating external network: $NetworkName"
    docker network create $NetworkName | Out-Null
  } else {
    Write-Host "==> Docker network OK: $NetworkName"
  }
}

Write-Host "==> [1/3] Building production image..."
$buildCmd = $composeArgs + @("build", "web")
if ($FullRebuild) { $buildCmd = $composeArgs + @("build", "--no-cache", "web") }
& docker @buildCmd
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }

Write-Host "==> [2/3] Starting help-support-web..."
& docker @($composeArgs + @("up", "-d", "web"))
if ($LASTEXITCODE -ne 0) { throw "docker up failed" }

Write-Host "==> Waiting for container..."
$ready = $false
for ($i = 1; $i -le 40; $i++) {
  try {
    $health = docker inspect --format="{{.State.Health.Status}}" help-support-web 2>$null
  } catch { $health = "starting" }
  if ($health -eq "healthy") { $ready = $true; break }
  if ($health -eq "unhealthy") {
    & docker @($composeArgs + @("logs", "--tail", "60", "web"))
    throw "Container unhealthy."
  }
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$hostPort/" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $ready = $true; break }
  } catch { }
  Start-Sleep -Seconds 3
}
if (-not $ready) { Write-Warning "Health wait timed out. Check logs: docker compose logs -f web" }

Write-Host "==> [3/3] Verifying..."
$verifyFail = $false
function Test-Url([string]$Label, [string]$Url) {
  try {
    $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15
    Write-Host "  OK  $Label — $Url"
  } catch {
    Write-Host "  FAIL $Label — $Url"
    $script:verifyFail = $true
  }
}

Test-Url "local home" "http://127.0.0.1:$hostPort/"
Test-Url "local admin" "http://127.0.0.1:$hostPort/admin/"
if ($SiteUrl -notmatch "127\.0\.0\.1|localhost") {
  Test-Url "public home" "$SiteUrl/"
  Test-Url "public admin" "$SiteUrl/admin/"
}

$running = docker ps --format "{{.Names}}" | Select-String -Pattern "^help-support-web$"
if ($running) { Write-Host "  OK  container help-support-web is running" }
else {
  Write-Host "  FAIL container help-support-web is not running"
  $verifyFail = $true
}

Write-Host ""
Write-Host "==> Post-deploy checklist"
Write-Host "  - Public URL:     $SiteUrl"
Write-Host "  - Local probe:    http://127.0.0.1:$hostPort/"
Write-Host "  - Hard-refresh browsers (Ctrl+Shift+R)"
Write-Host "  - Twilio webhook must be publicly reachable (SUPPORT_WEBHOOK_BASE_URL)"
Write-Host "  - Authorize Brevo IP if mail fails"
Write-Host "  - Logs: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f web"

if ($verifyFail) {
  throw "PARTIAL: Container may be up but verification failed — check reverse proxy / firewall."
}

Write-Host ""
Write-Host "SUCCESS: Help & Support production deploy finished (parity with local Docker build)."
