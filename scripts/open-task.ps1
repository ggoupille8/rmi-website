# open-task.ps1
# Opens docs/CURRENT_TASK.md in Notepad++
# Usage: powershell scripts/open-task.ps1
# Hotkey: Win+O (configured in autohotkey/rmi-workflow.ahk)

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetFile = Join-Path $projectRoot "docs\CURRENT_TASK.md"

$notepadPlusPlusPath = "C:\Program Files\Notepad++\notepad++.exe"
$notepadPlusPlusPathX86 = "C:\Program Files (x86)\Notepad++\notepad++.exe"

if (Test-Path $notepadPlusPlusPath) {
    Start-Process $notepadPlusPlusPath -ArgumentList "`"$targetFile`""
} elseif (Test-Path $notepadPlusPlusPathX86) {
    Start-Process $notepadPlusPlusPathX86 -ArgumentList "`"$targetFile`""
} else {
    # Fall back to default app
    Write-Host "Notepad++ not found - opening with default app" -ForegroundColor Yellow
    Start-Process $targetFile
}
