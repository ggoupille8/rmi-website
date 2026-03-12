# ============================================================================
# RMI MCP Server — Cloudflare Tunnel Setup Script
# Run as Administrator on the office PC
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== RMI MCP Server — Cloudflare Tunnel Setup ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# Step 1: Check if cloudflared is already installed
# ---------------------------------------------------------------------------

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue

if ($cloudflared) {
    Write-Host "[OK] cloudflared is already installed: $($cloudflared.Source)" -ForegroundColor Green
} else {
    Write-Host "[INFO] Installing cloudflared..." -ForegroundColor Yellow

    $msiUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi"
    $msiPath = "$env:TEMP\cloudflared.msi"

    Write-Host "  Downloading from $msiUrl..."
    Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing

    Write-Host "  Installing..."
    Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet" -Wait

    # Refresh PATH
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")

    $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cloudflared) {
        Write-Host "[OK] cloudflared installed successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] cloudflared not found in PATH after install. Try restarting PowerShell." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ---------------------------------------------------------------------------
# Step 2: Authenticate with Cloudflare
# ---------------------------------------------------------------------------

$credDir = "$env:USERPROFILE\.cloudflared"
$certPath = "$credDir\cert.pem"

if (Test-Path $certPath) {
    Write-Host "[OK] Already authenticated with Cloudflare" -ForegroundColor Green
} else {
    Write-Host "[INFO] Authenticating with Cloudflare..." -ForegroundColor Yellow
    Write-Host "  A browser window will open — log in to your Cloudflare account and select a domain."
    Write-Host ""
    cloudflared tunnel login

    if (Test-Path $certPath) {
        Write-Host "[OK] Authentication successful" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Authentication failed — cert.pem not found" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ---------------------------------------------------------------------------
# Step 3: Create tunnel
# ---------------------------------------------------------------------------

$tunnelName = "rmi-mcp-server"

Write-Host "[INFO] Creating tunnel '$tunnelName'..." -ForegroundColor Yellow
Write-Host "  (If it already exists, this will show an error — that's OK)"
Write-Host ""

try {
    cloudflared tunnel create $tunnelName
    Write-Host "[OK] Tunnel created" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Tunnel may already exist — continuing" -ForegroundColor Yellow
}

# Get tunnel ID
$tunnelInfo = cloudflared tunnel list --name $tunnelName --output json 2>$null | ConvertFrom-Json
if ($tunnelInfo -and $tunnelInfo.Count -gt 0) {
    $tunnelId = $tunnelInfo[0].id
    Write-Host "[OK] Tunnel ID: $tunnelId" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Could not get tunnel ID. Run 'cloudflared tunnel list' manually." -ForegroundColor Red
    exit 1
}

Write-Host ""

# ---------------------------------------------------------------------------
# Step 4: Display next steps
# ---------------------------------------------------------------------------

Write-Host "=== NEXT STEPS (manual) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure DNS routing:" -ForegroundColor White
Write-Host "   cloudflared tunnel route dns $tunnelName mcp.rmi-llc.net" -ForegroundColor Gray
Write-Host "   (Or use any subdomain on a Cloudflare-managed domain)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update the config file:" -ForegroundColor White
Write-Host "   Edit mcp-server/cloudflared-config.yml:" -ForegroundColor Gray
Write-Host "   - Set 'tunnel:' to $tunnelId" -ForegroundColor Gray
Write-Host "   - Set 'credentials-file:' to $credDir\$tunnelId.json" -ForegroundColor Gray
Write-Host "   - Set 'hostname:' to your chosen subdomain" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Copy config to cloudflared directory:" -ForegroundColor White
Write-Host "   Copy-Item .\cloudflared-config.yml $credDir\config.yml" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Install cloudflared as a Windows service:" -ForegroundColor White
Write-Host "   cloudflared service install" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Start the service:" -ForegroundColor White
Write-Host "   Start-Service cloudflared" -ForegroundColor Gray
Write-Host ""
Write-Host "=== QUICK TEST (no DNS needed) ===" -ForegroundColor Cyan
Write-Host "   cloudflared tunnel --url http://localhost:3100" -ForegroundColor Gray
Write-Host "   This gives a temporary *.trycloudflare.com URL for testing." -ForegroundColor Gray
Write-Host ""
