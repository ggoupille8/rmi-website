$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host $Message
}

function Fail-And-Exit {
  param([string]$Message)
  Write-Host "FAIL: $Message"
  exit 1
}

Write-Step "Dev reset starting (Windows recovery path)."

function Get-ListeningPids {
  param([int[]]$TargetPorts)

  $connections = @()
  try {
    $connections = Get-NetTCPConnection -State Listen -ErrorAction Stop |
      Where-Object { $TargetPorts -contains $_.LocalPort } |
      Select-Object LocalPort, OwningProcess
  } catch {
    $connections = @()
  }

  if ($connections.Count -eq 0) {
    try {
      $netstat = netstat -ano | Select-String "LISTENING"
      foreach ($line in $netstat) {
        $parts = $line.ToString().Trim() -split "\s+"
        if ($parts.Length -lt 5) { continue }
        $local = $parts[1]
        $pid = $parts[4]
        if ($local -match ":(\d+)$") {
          $port = [int]$matches[1]
          if ($TargetPorts -contains $port) {
            $connections += [pscustomobject]@{
              LocalPort = $port
              OwningProcess = [int]$pid
            }
          }
        }
      }
    } catch {
      $connections = @()
    }
  }

  return $connections
}

$defaultPorts = @(4321, 4322, 4323, 4324, 4325, 4326)
$ports = $defaultPorts
$portsConfigPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "ports.json"
if (Test-Path $portsConfigPath) {
  try {
    $config = Get-Content -Raw $portsConfigPath | ConvertFrom-Json
    if ($null -ne $config.ports -and $config.ports.Count -gt 0) {
      $ports = @($config.ports | ForEach-Object { [int]$_ })
    }
  } catch {
    $ports = $defaultPorts
  }
}

Write-Step "Stopping locking processes (node on ports: $($ports -join ","), esbuild)."
try {
  $listening = Get-ListeningPids -TargetPorts $ports
  $pids = $listening |
    Where-Object { $_.OwningProcess -gt 0 } |
    Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($processId in $pids) {
    try {
      $proc = Get-Process -Id $processId -ErrorAction Stop
      if ($proc.ProcessName -eq "node") {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      }
    } catch {
      # Ignore failures for targeted cleanup
    }
  }

  Get-Process -Name "esbuild" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
} catch {
  # Intentionally ignore failures for process cleanup
}

Write-Step "Removing node_modules."
try {
  Remove-Item -Recurse -Force "node_modules" -ErrorAction Stop
} catch {
  Fail-And-Exit "Failed to remove node_modules."
}

Write-Step "Installing dependencies with npm ci."
& npm ci
if ($LASTEXITCODE -ne 0) {
  Fail-And-Exit "npm ci failed."
}

Write-Step "Starting dev server via npm run dev:all."
& npm run dev:all
if ($LASTEXITCODE -ne 0) {
  Fail-And-Exit "npm run dev:all failed."
}

Write-Step "PASS: Dev reset completed."
exit 0
