# Smoke Test Script for RMI LLC Website
# Tests critical API endpoints on both apex and www domains

$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"

Write-Host "`n🧪 Running Smoke Tests..." -ForegroundColor $Yellow
Write-Host "=" * 50 -ForegroundColor $Yellow

$testBody = @{
    name = "Smoke Test User"
    company = "Smoke Test Company"
    email = "smoke-test@example.com"
    phone = "555-123-4567"
    message = "This is an automated smoke test. Please ignore."
    serviceType = "installation"
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

$testsPassed = 0
$testsFailed = 0
$testResults = @()

# Test 1: www.rmi-llc.net (canonical domain)
Write-Host "`n[1/2] Testing www.rmi-llc.net/api/quote..." -ForegroundColor $Yellow

try {
    $response = Invoke-RestMethod -Uri "https://www.rmi-llc.net/api/quote" `
        -Method POST `
        -Body $testBody `
        -Headers $headers `
        -ErrorAction Stop

    if ($response.ok -eq $true) {
        Write-Host "   ✓ PASS: www domain returned ok: true" -ForegroundColor $Green
        $testsPassed++
        $testResults += @{ Test = "www.rmi-llc.net"; Status = "PASS" }
    } else {
        Write-Host "   ✗ FAIL: www domain returned ok: false" -ForegroundColor $Red
        $testsFailed++
        $testResults += @{ Test = "www.rmi-llc.net"; Status = "FAIL"; Reason = "ok: false" }
    }
} catch {
    Write-Host "   ✗ FAIL: www domain request failed" -ForegroundColor $Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor $Red
    $testsFailed++
    $testResults += @{ Test = "www.rmi-llc.net"; Status = "FAIL"; Reason = $_.Exception.Message }
}

# Test 2: rmi-llc.net (apex domain - should redirect)
Write-Host "`n[2/2] Testing rmi-llc.net/api/quote (with redirect handling)..." -ForegroundColor $Yellow

try {
    # Use -MaximumRedirection 5 to allow redirects
    $response = Invoke-RestMethod -Uri "https://rmi-llc.net/api/quote" `
        -Method POST `
        -Body $testBody `
        -Headers $headers `
        -MaximumRedirection 5 `
        -ErrorAction Stop

    if ($response.ok -eq $true) {
        Write-Host "   ✓ PASS: apex domain returned ok: true (redirect handled)" -ForegroundColor $Green
        $testsPassed++
        $testResults += @{ Test = "rmi-llc.net"; Status = "PASS" }
    } else {
        Write-Host "   ✗ FAIL: apex domain returned ok: false" -ForegroundColor $Red
        $testsFailed++
        $testResults += @{ Test = "rmi-llc.net"; Status = "FAIL"; Reason = "ok: false" }
    }
} catch {
    Write-Host "   ✗ FAIL: apex domain request failed" -ForegroundColor $Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor $Red
    $testsFailed++
    $testResults += @{ Test = "rmi-llc.net"; Status = "FAIL"; Reason = $_.Exception.Message }
}

# Summary
Write-Host "`n" + ("=" * 50) -ForegroundColor $Yellow
Write-Host "Test Summary:" -ForegroundColor $Yellow
Write-Host "  Passed: $testsPassed" -ForegroundColor $Green
Write-Host "  Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { $Green } else { $Red })

if ($testsFailed -eq 0) {
    Write-Host "`n✅ All smoke tests passed!" -ForegroundColor $Green
    exit 0
} else {
    Write-Host "`n❌ Some smoke tests failed!" -ForegroundColor $Red
    exit 1
}
