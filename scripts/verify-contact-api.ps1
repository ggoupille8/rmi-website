$ErrorActionPreference = "Stop"

$baseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:4321" }

$missing = @()
if ([string]::IsNullOrWhiteSpace($env:POSTGRES_URL)) {
  $missing += "POSTGRES_URL"
}
if ([string]::IsNullOrWhiteSpace($env:ADMIN_API_KEY)) {
  $missing += "ADMIN_API_KEY"
}
if ($missing.Count -gt 0) {
  Write-Error ("Missing required env vars: " + ($missing -join ", "))
  Write-Error "Set them in .env before running this script."
  exit 1
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Body,
    [hashtable]$Headers
  )

  return Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -Body $Body -UseBasicParsing
}

Write-Host "Verifying contact API at $baseUrl"

$payload = @{
  name = "Test User"
  email = "test@example.com"
  message = "Hello from verify script"
  metadata = @{
    elapsedMs = 1200
    fastSubmit = $false
  }
} | ConvertTo-Json -Compress

$contactResp = Invoke-JsonRequest -Method "POST" -Url "$baseUrl/api/contact" -Body $payload -Headers @{
  "Content-Type" = "application/json"
}

if ($contactResp.StatusCode -ne 200) {
  throw "Expected 200 from /api/contact, got $($contactResp.StatusCode)"
}

$adminResp = Invoke-WebRequest -Method "GET" -Uri "$baseUrl/api/admin/contacts?limit=1" -Headers @{
  "Authorization" = "Bearer $($env:ADMIN_API_KEY)"
} -UseBasicParsing

if ($adminResp.StatusCode -ne 200) {
  throw "Expected 200 from /api/admin/contacts, got $($adminResp.StatusCode)"
}

$cacheControl = $adminResp.Headers["Cache-Control"]
if (-not $cacheControl -or $cacheControl -notmatch "no-store") {
  throw "Expected Cache-Control: no-store on admin response."
}

$adminData = $adminResp.Content | ConvertFrom-Json
$beforeTotal = [int]$adminData.pagination.total

$honeypotPayload = @{
  name = "Test User"
  email = "test@example.com"
  message = "Hello from verify script"
  website = "spam"
  metadata = @{
    elapsedMs = 1200
    fastSubmit = $true
  }
} | ConvertTo-Json -Compress

$honeypotResp = Invoke-JsonRequest -Method "POST" -Url "$baseUrl/api/contact" -Body $honeypotPayload -Headers @{
  "Content-Type" = "application/json"
}

if ($honeypotResp.StatusCode -ne 200) {
  throw "Expected 200 from honeypot submit, got $($honeypotResp.StatusCode)"
}

$afterResp = Invoke-WebRequest -Method "GET" -Uri "$baseUrl/api/admin/contacts?limit=1" -Headers @{
  "Authorization" = "Bearer $($env:ADMIN_API_KEY)"
} -UseBasicParsing

$afterData = $afterResp.Content | ConvertFrom-Json
$afterTotal = [int]$afterData.pagination.total

if ($afterTotal -gt $beforeTotal) {
  throw "Honeypot submission appears to be stored."
}

Write-Host "OK: contact API verification passed."
