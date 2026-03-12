# RMI MCP File Server — Setup Guide

This server gives Claude read-only access to the P:\ share drive via the MCP protocol. It runs on the office PC and is exposed to the internet through a Cloudflare Tunnel.

```
Claude.ai  <-->  Cloudflare Tunnel  <-->  Office PC (Node.js MCP Server)  <-->  P:\ drive
```

---

## Prerequisites

- Windows PC with admin rights
- P:\ drive mapped to `\\appserver`
- Node.js 20+ installed
- A Cloudflare account (free tier works)

---

## Step 1: Install the MCP Server

```powershell
cd mcp-server
npm install
npm run build
```

Verify the build succeeded — `dist/` should contain compiled JS files.

---

## Step 2: Configure Environment Variables

Generate an auth token:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create `mcp-server/.env` (copy from `.env.example`):

```env
MCP_ROOT_PATH=P:\
MCP_AUTH_TOKEN=<paste-your-64-char-hex-token>
MCP_PORT=3100
```

---

## Step 3: Test Locally

```powershell
cd mcp-server
npm start
```

You should see:

```
RMI MCP File Server v1.0.0
  Root path : P:\
  Port      : 3100
  MCP endpoint: http://localhost:3100/mcp
  Health check: http://localhost:3100/healthz
```

Test the health endpoint:

```powershell
curl http://localhost:3100/healthz
```

Test auth enforcement (should return 401):

```powershell
curl http://localhost:3100/mcp
```

---

## Step 4: Install as Windows Service

This keeps the MCP server running in the background, auto-starting on boot.

```powershell
# Set the auth token in your session first
$env:MCP_AUTH_TOKEN = "<your-token>"
$env:MCP_ROOT_PATH = "P:\"
$env:MCP_PORT = "3100"

# Install
cd mcp-server
npm run install-service
```

The service appears in Windows Services as "RMI MCP Server". View logs in Event Viewer > Applications.

To uninstall:

```powershell
npm run uninstall-service
```

---

## Step 5: Set Up Cloudflare Tunnel

### Option A: Quick Test (temporary URL)

```powershell
cloudflared tunnel --url http://localhost:3100
```

This gives you a random `*.trycloudflare.com` URL. Great for testing, but the URL changes on restart.

### Option B: Permanent Tunnel (recommended)

Run the setup script as Administrator:

```powershell
cd mcp-server
powershell -ExecutionPolicy Bypass -File scripts\setup-tunnel.ps1
```

This will:
1. Install cloudflared (if needed)
2. Authenticate with your Cloudflare account
3. Create a named tunnel `rmi-mcp-server`

Then follow the script's output to:
1. Route DNS: `cloudflared tunnel route dns rmi-mcp-server mcp.rmi-llc.net`
2. Edit `cloudflared-config.yml` with your tunnel ID
3. Copy config: `Copy-Item cloudflared-config.yml $env:USERPROFILE\.cloudflared\config.yml`
4. Install as service: `cloudflared service install`

---

## Step 6: Add to Claude.ai

In Claude.ai settings, add an MCP server:

- **Name:** RMI File Server
- **URL:** `https://mcp.rmi-llc.net/mcp` (or your trycloudflare.com URL + `/mcp`)
- **Authentication:** Bearer token — use the same `MCP_AUTH_TOKEN` value

---

## Step 7: Verify from Claude.ai

Ask Claude to:

```
List the files in the root of the P: drive
```

```
Show me the directory tree of /Awarded Contracts with maxDepth 2
```

```
Read the WIP Excel file at /WIP - Financial/RMI WIP - 2026.xlsx
```

---

## Available Tools

| Tool | Description |
|------|-------------|
| `list_directory` | List files/folders at a path |
| `read_file` | Read file contents (text or base64) |
| `search_files` | Glob search for files |
| `get_file_info` | File metadata (size, dates, MIME type) |
| `read_excel` | Parse Excel/CSV with sheet selection |
| `read_pdf_text` | Extract text from PDFs |
| `directory_tree` | Nested tree view of folder structure |

---

## Troubleshooting

**Server won't start:** Check that P:\ is accessible. Run `dir P:\` to verify.

**Auth errors:** Make sure the Bearer token in Claude.ai matches `MCP_AUTH_TOKEN` exactly.

**Tunnel not connecting:** Run `cloudflared tunnel list` to verify the tunnel exists. Check `cloudflared tunnel info rmi-mcp-server`.

**Service won't start after reboot:** Check Event Viewer for errors. The P:\ drive mapping must be available at boot — if it's a user-mapped drive, you may need to map it in a startup script.

**Rate limited:** The server allows 60 requests per minute. If hitting this limit, wait a minute.
