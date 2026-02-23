# screenshots.ps1
# Captures screenshots at all breakpoints for visual review
# Usage: powershell scripts/screenshots.ps1
# Hotkey: Win+S (configured in autohotkey/rmi-workflow.ahk)
# Output: docs/screenshots/current/

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot "docs\screenshots\current"

# Clear current screenshots
if (Test-Path $outputDir) {
    Remove-Item "$outputDir\*" -Force -Recurse
}
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "Capturing screenshots at all breakpoints..." -ForegroundColor Cyan

# Run Playwright screenshot script
$env:SCREENSHOT_OUTPUT = $outputDir
npx playwright test tests/screenshots.spec.ts --reporter=list 2>&1

if ($LASTEXITCODE -eq 0) {
    $count = (Get-ChildItem $outputDir -Filter "*.png").Count
    Write-Host "SUCCESS: $count screenshots saved to docs/screenshots/current/" -ForegroundColor Green
    Write-Host "Open folder to review or drag into Claude.ai for analysis" -ForegroundColor Cyan
    # Open the folder in Explorer for easy drag-to-Claude
    Start-Process explorer.exe $outputDir
} else {
    Write-Host "WARNING: Screenshot capture had errors. Check Playwright output above." -ForegroundColor Yellow
}
