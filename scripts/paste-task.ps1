# paste-task.ps1
# Writes clipboard content to docs/CURRENT_TASK.md
# Usage: powershell scripts/paste-task.ps1
# Hotkey: Win+T (configured in autohotkey/rmi-workflow.ahk)

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetFile = Join-Path $projectRoot "docs\CURRENT_TASK.md"

$clipboardContent = Get-Clipboard -Raw

if ([string]::IsNullOrWhiteSpace($clipboardContent)) {
    Write-Host "ERROR: Clipboard is empty. Copy the spec from Claude.ai first." -ForegroundColor Red
    exit 1
}

# Backup existing task before overwriting
$backupFile = Join-Path $projectRoot "docs\CURRENT_TASK.backup.md"
if (Test-Path $targetFile) {
    Copy-Item $targetFile $backupFile -Force
    Write-Host "Backed up previous task to docs/CURRENT_TASK.backup.md" -ForegroundColor Yellow
}

$clipboardContent | Out-File $targetFile -Encoding UTF8 -NoNewline

Write-Host "SUCCESS: docs/CURRENT_TASK.md updated" -ForegroundColor Green
Write-Host "Lines written: $($clipboardContent.Split("`n").Count)" -ForegroundColor Cyan
Write-Host "Claude Code prompt: 'Read docs/CURRENT_TASK.md and implement everything in it. Work until complete.'" -ForegroundColor Cyan
