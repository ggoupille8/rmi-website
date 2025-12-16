# Setup pre-commit hook for secret detection (Windows)
# Run this script once to install the pre-commit hook

$hookPath = ".git\hooks\pre-commit"
$hookContent = @"
#!/bin/sh
# Pre-commit hook to check for secrets
node scripts/check-secrets.js
"@

# Create hooks directory if it doesn't exist
$hooksDir = ".git\hooks"
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
}

# Write the hook
[System.IO.File]::WriteAllText($hookPath, $hookContent)

# Make it executable (Git on Windows respects this)
git update-index --chmod=+x .git/hooks/pre-commit

Write-Host "Pre-commit hook installed successfully!" -ForegroundColor Green
Write-Host "The hook will run 'npm run check-secrets' before each commit." -ForegroundColor Cyan

