# Smoke Test Script for RMI LLC Website
# Tests apex redirect behavior and canonical POST to www for /api/quote

$ErrorActionPreference = "Stop"

$Green  = "Green"
$Red    = "Red"
$Yellow = "Yellow"

Write-Host ""
Write-Host "Running Smoke Tests..." -ForegroundColor $Yellow
Write-Host ("=" * 50) -ForegroundColor $Yellow

$testsPassed = 0
$testsFailed = 0

$headers = @{
  "Accept"       = "application/json"
  "Content-Type" = "application/json"
}

$testBody = @{
  name        = "Smoke Test User"
  company     = "Smoke Test Company"
  email       = "smoke-test@example.com"
  phone       = "555-123-4567"
  message     = "Automated smoke test submission."
  serviceType = "Insulation Services"
  timestamp   = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
} | ConvertTo-Json -Compress

function Get-HeadNoRedirect {
  param([Parameter(Mandatory=$true)][string]$Url)

  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Head -MaximumRedirection 0 -ErrorAction Stop
    return @{
      Status   = [int]$resp.StatusCode
      Location = $resp.Headers["Location"]
    }
  } catch {
    $webResp = $_.Exception.Response
    if ($null -ne $webResp) {
      return @{
        Status   = [int]$webResp.StatusCode
        Location = $webResp.Headers["Location"]
      }
    }
    throw
  }
}

# 1) Apex redirect check (HEAD only)
Write-Host ""
Write-Host "[1/2] Apex redirect check for /api/quote" -ForegroundColor $Yellow

try {
  $r = Get-HeadNoRedirect -Url "https://rmi-llc.net/api/quote"
  $status = $r.Status
  $location = $r.Location

  if ((@(301,302,307,308) -contains $status) -and $location) {
    Write-Host "PASS: apex returned $status Location: $location" -ForegroundColor $Green
    $testsPassed++
  } else {
    Write-Host "FAIL: apex returned $status Location: $location" -ForegroundColor $Red
    $testsFailed++
  }
} catch {
  Write-Host "FAIL: apex check threw: $($_.Exception.Message)" -ForegroundColor $Red
  $testsFailed++
}

# 2) Canonical POST to www
Write-Host ""
Write-Host "[2/2] POST to https://www.rmi-llc.net/api/quote" -ForegroundColor $Yellow

try {
  Start-Sleep -Seconds 3
  $resp = Invoke-WebRequest `
    -Uri "https://www.rmi-llc.net/api/quote" `
    -Method Post `
    -Headers $headers `
    -Body $testBody `
    -ErrorAction Stop

  $code = [int]$resp.StatusCode
  if ($code -eq 200 -or $code -eq 202) {
    Write-Host "PASS: quote POST returned $code" -ForegroundColor $Green
    $testsPassed++
  } else {
    Write-Host "FAIL: unexpected status $code" -ForegroundColor $Red
    Write-Host "Body: $($resp.Content)" -ForegroundColor $Red
    $testsFailed++
  }
} catch {
  $webResp = $_.Exception.Response
  if ($null -ne $webResp) {
    $reader = New-Object System.IO.StreamReader($webResp.GetResponseStream())
    $bodyText = $reader.ReadToEnd()
    $status = [int]$webResp.StatusCode
    if ($bodyText -match "Submission too fast") {
      Write-Host "WARN: Submission too fast, retrying after delay..." -ForegroundColor $Yellow
      Start-Sleep -Seconds 4
      try {
        $retry = Invoke-WebRequest `
          -Uri "https://www.rmi-llc.net/api/quote" `
          -Method Post `
          -Headers $headers `
          -Body $testBody `
          -ErrorAction Stop
        $retryCode = [int]$retry.StatusCode
        if ($retryCode -eq 200 -or $retryCode -eq 202) {
          Write-Host "PASS: retry POST returned $retryCode" -ForegroundColor $Green
          $testsPassed++
        } else {
          Write-Host "FAIL: retry returned $retryCode" -ForegroundColor $Red
          Write-Host "Body: $($retry.Content)" -ForegroundColor $Red
          $testsFailed++
        }
      } catch {
        $retryResp = $_.Exception.Response
        if ($null -ne $retryResp) {
          $retryReader = New-Object System.IO.StreamReader($retryResp.GetResponseStream())
          $retryBody = $retryReader.ReadToEnd()
          $retryStatus = [int]$retryResp.StatusCode
          Write-Host "FAIL: retry POST returned $retryStatus" -ForegroundColor $Red
          Write-Host "Body: $retryBody" -ForegroundColor $Red
          $testsFailed++
        } else {
          Write-Host "FAIL: retry POST threw: $($_.Exception.Message)" -ForegroundColor $Red
          $testsFailed++
        }
      }
    } else {
      Write-Host "FAIL: POST returned $status" -ForegroundColor $Red
      Write-Host "Body: $bodyText" -ForegroundColor $Red
      $testsFailed++
    }
  } else {
    Write-Host "FAIL: POST threw: $($_.Exception.Message)" -ForegroundColor $Red
    $testsFailed++
  }
}

Write-Host ""
Write-Host ("=" * 50) -ForegroundColor $Yellow
Write-Host "Summary: Passed=$testsPassed Failed=$testsFailed" -ForegroundColor $Yellow

if ($testsFailed -gt 0) { exit 1 }
exit 0
