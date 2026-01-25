param(
  [int[]]$Ports = @(4321, 4322, 4323, 4324, 4325, 4326),
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"
$portsLabel = $Ports -join ","
Write-Host "Port cleanup starting for ports: $portsLabel"

function Get-ProcessName {
  param([int]$ProcessId)
  try {
    $proc = Get-Process -Id $ProcessId -ErrorAction Stop
    return $proc.ProcessName
  } catch {
    return "unknown"
  }
}

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

$listening = Get-ListeningPids -TargetPorts $Ports
if ($listening.Count -eq 0) {
  Write-Host "PASS: No processes listening on ports: $portsLabel"
  exit 0
}

$pids = $listening |
  Where-Object { $_.OwningProcess -gt 0 } |
  Select-Object -ExpandProperty OwningProcess -Unique

foreach ($item in $listening) {
  $procName = Get-ProcessName -ProcessId $item.OwningProcess
  Write-Host "Found port $($item.LocalPort) listening (PID $($item.OwningProcess), $procName)"
}

$failed = $false
foreach ($processId in $pids) {
  $procName = Get-ProcessName -ProcessId $processId
  if ($WhatIf) {
    Write-Host "DRY RUN: Would stop PID $processId ($procName)"
    continue
  }
  try {
    Stop-Process -Id $processId -ErrorAction Stop
    Write-Host "Stopped PID $processId ($procName)"
  } catch {
    Write-Host "FAIL: Could not stop PID $processId ($procName)"
    $failed = $true
  }
}

Start-Sleep -Milliseconds 500
$remaining = Get-ListeningPids -TargetPorts $Ports
if ($remaining.Count -gt 0) {
  foreach ($item in $remaining) {
    $procName = Get-ProcessName -ProcessId $item.OwningProcess
    Write-Host "FAIL: Port $($item.LocalPort) still listening (PID $($item.OwningProcess), $procName)"
  }
  $failed = $true
}

if ($failed) {
  Write-Host "FAIL: Port cleanup did not complete."
  exit 1
}

Write-Host "PASS: Ports freed: $portsLabel"
exit 0
